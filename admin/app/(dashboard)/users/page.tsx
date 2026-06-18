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
import { useState } from "react";
import CrudDataGrid from "@/components/CrudDataGrid";
import { mediaUrl } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

export default function UsersPage() {
  const [selected, setSelected] = useState<AdminUser | null>(null);

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
          </Box>
        )}
      </Drawer>
    </>
  );
}
