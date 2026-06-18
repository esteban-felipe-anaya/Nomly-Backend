"use client";

import {
  Box,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { GridColDef } from "@mui/x-data-grid";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import CrudDataGrid from "@/components/CrudDataGrid";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { api, apiErrorMessage } from "@/lib/api";
import {
  ORDER_STATUSES,
  StatusChip,
  statusLabel,
} from "@/lib/orderStatus";
import type { Order, OrderStatus, Paginated } from "@/lib/types";

function money(n: number | undefined | null): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n ?? 0);
}

export default function OrdersPage() {
  const { notify } = useSnackbar();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Order | null>(null);

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: OrderStatus;
    }) => {
      const { data } = await api.post<Order>(
        `/admin-api/orders/${id}/set_status`,
        { status },
      );
      return data;
    },
    onMutate: async ({ id, status }) => {
      setSelected((s) => (s && s.id === id ? { ...s, status } : s));
      await qc.cancelQueries({ queryKey: ["orders"] });
      const snapshots = qc.getQueriesData<Paginated<Order>>({
        queryKey: ["orders"],
      });
      snapshots.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<Paginated<Order>>(key, {
          ...data,
          results: data.results.map((o) =>
            o.id === id ? { ...o, status } : o,
          ),
        });
      });
      return { snapshots };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      notify(apiErrorMessage(err), "error");
    },
    onSuccess: () => {
      notify("Order status updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const columns: GridColDef<Order>[] = [
    { field: "id", headerName: "Order", width: 150 },
    {
      field: "user_email",
      headerName: "Customer",
      flex: 1,
      minWidth: 180,
      sortable: false,
    },
    {
      field: "restaurant_name",
      headerName: "Restaurant",
      flex: 1,
      minWidth: 150,
      sortable: false,
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (p) => <StatusChip status={p.value} />,
    },
    {
      field: "total",
      headerName: "Total",
      width: 120,
      type: "number",
      valueFormatter: (value: number) => money(value),
    },
    {
      field: "placed_at",
      headerName: "Placed",
      width: 170,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleString() : "—",
    },
  ];

  return (
    <>
      <CrudDataGrid<Order>
        title="Orders"
        resource="orders"
        queryKey="orders"
        columns={columns}
        readOnly
        extraParams={{ status: statusFilter || undefined }}
        onRowClick={setSelected}
        searchPlaceholder="Search orders…"
        toolbarExtra={
          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ width: 170 }}
          >
            <MenuItem value="">All</MenuItem>
            {ORDER_STATUSES.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 440 } } }}
      >
        {selected && (
          <Box sx={{ p: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">Order {selected.id}</Typography>
              <IconButton onClick={() => setSelected(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <TextField
              select
              fullWidth
              label="Status"
              value={selected.status}
              onChange={(e) =>
                setStatus.mutate({
                  id: selected.id,
                  status: e.target.value as OrderStatus,
                })
              }
              disabled={setStatus.isPending}
              sx={{ my: 2 }}
            >
              {ORDER_STATUSES.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                  {statusLabel(s)}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="subtitle2" color="text.secondary">
              Customer
            </Typography>
            <Typography>{selected.user_name ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selected.user_email}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Restaurant
            </Typography>
            <Typography>{selected.restaurant_name ?? "—"}</Typography>

            <Stack
              direction="row"
              spacing={3}
              sx={{ mt: 2 }}
              flexWrap="wrap"
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Payment
                </Typography>
                <Typography>{selected.payment_method ?? "—"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Promo
                </Typography>
                <Typography>{selected.promo_code || "—"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ETA
                </Typography>
                <Typography>
                  {selected.eta_minutes ? `${selected.eta_minutes} min` : "—"}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Items
            </Typography>
            <Stack spacing={1}>
              {selected.items.map((item, i) => (
                <Stack
                  key={item.id ?? i}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="body2">
                      {item.quantity}× {item.name}
                    </Typography>
                    {item.instructions && (
                      <Typography variant="caption" color="text.secondary">
                        {item.instructions}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2">{money(item.line_total)}</Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5}>
              {[
                ["Subtotal", selected.subtotal],
                ["Discount", -Math.abs(selected.discount ?? 0)],
                ["Delivery fee", selected.delivery_fee],
                ["Service fee", selected.service_fee],
                ["Tax", selected.tax],
                ["Tip", selected.tip],
              ].map(([label, val]) => (
                <Stack
                  key={String(label)}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2">
                    {money(val as number)}
                  </Typography>
                </Stack>
              ))}
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="subtitle1">Total</Typography>
                <Typography variant="subtitle1">
                  {money(selected.total)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}
