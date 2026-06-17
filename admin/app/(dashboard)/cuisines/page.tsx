"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage } from "@/lib/api";
import type { Cuisine } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const RESOURCE = "cuisines";
const INVALIDATE = ["cuisines"];

export default function CuisinesPage() {
  const { notify } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cuisine | null>(null);
  const [toDelete, setToDelete] = useState<Cuisine | null>(null);

  const create = useCreate<Cuisine, FormValues>(RESOURCE, INVALIDATE);
  const update = useUpdate<Cuisine, FormValues>(RESOURCE, INVALIDATE);
  const remove = useRemove(RESOURCE, INVALIDATE);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", icon: "" },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", icon: "" });
    setOpen(true);
  };

  const openEdit = (row: Cuisine) => {
    setEditing(row);
    reset({ name: row.name, icon: row.icon ?? "" });
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: values });
        notify("Cuisine updated");
      } else {
        await create.mutateAsync(values);
        notify("Cuisine created");
      }
      setOpen(false);
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      notify("Cuisine deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<Cuisine>[] = [
    {
      field: "icon",
      headerName: "Icon",
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <Avatar src={p.value || undefined} sx={{ width: 32, height: 32 }}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    { field: "id", headerName: "ID", width: 160 },
  ];

  return (
    <>
      <CrudDataGrid<Cuisine>
        title="Cuisines"
        resource={RESOURCE}
        queryKey="cuisines"
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={setToDelete}
        addLabel="Add cuisine"
        searchPlaceholder="Search cuisines…"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? "Edit cuisine" : "New cuisine"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Name"
                fullWidth
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField
                label="Icon URL or emoji"
                fullWidth
                {...register("icon")}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending || update.isPending}
            >
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete cuisine"
        message={`Delete "${toDelete?.name}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
