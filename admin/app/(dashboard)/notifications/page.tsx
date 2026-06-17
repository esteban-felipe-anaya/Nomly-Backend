"use client";

import CampaignIcon from "@mui/icons-material/Campaign";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { api, apiErrorMessage } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { useRemove } from "@/lib/useCrud";

const TYPES = ["offer", "order", "system"];

export default function NotificationsPage() {
  const { notify } = useSnackbar();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("offer");
  const [toDelete, setToDelete] = useState<NotificationItem | null>(null);

  const remove = useRemove("notifications", ["notifications"]);

  const broadcast = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ created: number }>(
        "/admin-api/notifications/broadcast",
        { title, body, type },
      );
      return data;
    },
    onSuccess: (data) => {
      notify(`Broadcast sent to ${data.created} user(s)`);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      setTitle("");
      setBody("");
      setType("offer");
    },
    onError: (err) => notify(apiErrorMessage(err), "error"),
  });

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      notify("Notification deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<NotificationItem>[] = [
    { field: "title", headerName: "Title", flex: 1, minWidth: 180 },
    { field: "body", headerName: "Body", flex: 2, minWidth: 240, sortable: false },
    {
      field: "type",
      headerName: "Type",
      width: 120,
      renderCell: (p) => (
        <Chip size="small" label={p.value} sx={{ textTransform: "capitalize" }} />
      ),
    },
    {
      field: "read",
      headerName: "Read",
      width: 90,
      type: "boolean",
    },
    {
      field: "date",
      headerName: "Date",
      width: 170,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleString() : "—",
    },
  ];

  return (
    <>
      <CrudDataGrid<NotificationItem>
        title="Notifications"
        resource="notifications"
        queryKey="notifications"
        columns={columns}
        onDelete={setToDelete}
        searchPlaceholder="Search notifications…"
        toolbarExtra={
          <Button
            variant="contained"
            startIcon={<CampaignIcon />}
            onClick={() => setOpen(true)}
          >
            Broadcast
          </Button>
        }
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Broadcast notification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Body"
              fullWidth
              multiline
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <TextField
              label="Type"
              select
              fullWidth
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: "capitalize" }}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => broadcast.mutate()}
            disabled={broadcast.isPending || !title.trim()}
          >
            Send broadcast
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete notification"
        message={`Delete "${toDelete?.title}"?`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
