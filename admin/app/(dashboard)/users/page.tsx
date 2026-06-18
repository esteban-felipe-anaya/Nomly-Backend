"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import CrudDataGrid from "@/components/CrudDataGrid";
import { api, mediaUrl } from "@/lib/api";
import type { AdminUser, Paginated } from "@/lib/types";

interface UserAddress {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  notes?: string;
  is_default: boolean;
}

export default function UsersPage() {
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ["addresses", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await api.get<Paginated<UserAddress>>(
        `/admin-api/addresses?user=${selected!.id}`,
      );
      return data.results;
    },
  });

  const columns: GridColDef<AdminUser>[] = [
    {
      field: "avatar",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <Avatar src={mediaUrl(p.value) || undefined} sx={{ width: 32, height: 32 }}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 200 },
    { field: "phone", headerName: "Phone", width: 150, sortable: false },
    {
      field: "is_staff",
      headerName: "Staff",
      width: 100,
      renderCell: (p) =>
        p.value ? <Chip size="small" color="primary" label="Staff" /> : null,
    },
    {
      field: "is_active",
      headerName: "Active",
      width: 100,
      type: "boolean",
    },
    {
      field: "date_joined",
      headerName: "Joined",
      width: 130,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "—",
    },
  ];

  return (
    <>
      <CrudDataGrid<AdminUser>
        title="Users"
        resource="users"
        queryKey="users"
        columns={columns}
        readOnly
        onRowClick={setSelected}
        searchPlaceholder="Search users…"
      />

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 380 } } }}
      >
        {selected && (
          <Box sx={{ p: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">User detail</Typography>
              <IconButton onClick={() => setSelected(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Avatar
                src={mediaUrl(selected.avatar) || undefined}
                sx={{ width: 72, height: 72 }}
              >
                {selected.name?.[0]}
              </Avatar>
              <Typography variant="h6">{selected.name}</Typography>
              <Stack direction="row" spacing={1}>
                {selected.is_staff && (
                  <Chip size="small" color="primary" label="Staff" />
                )}
                <Chip
                  size="small"
                  color={selected.is_active ? "success" : "default"}
                  label={selected.is_active ? "Active" : "Inactive"}
                />
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {[
                ["Email", selected.email],
                ["Phone", selected.phone || "—"],
                ["User ID", selected.id],
                [
                  "Joined",
                  selected.date_joined
                    ? new Date(selected.date_joined).toLocaleString()
                    : "—",
                ],
              ].map(([label, val]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography>{val}</Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Addresses {addresses ? `(${addresses.length})` : ""}
            </Typography>
            <Stack spacing={1}>
              {addresses && addresses.length > 0 ? (
                addresses.map((a) => (
                  <Box
                    key={a.id}
                    sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{a.label}</Typography>
                      {a.is_default && (
                        <Chip size="small" color="primary" label="Default" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {[a.line1, a.line2, a.city].filter(Boolean).join(", ")}
                    </Typography>
                    {a.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {a.notes}
                      </Typography>
                    )}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No saved addresses.
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}
