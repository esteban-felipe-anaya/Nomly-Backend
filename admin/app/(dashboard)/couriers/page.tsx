"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import ImageUploadField from "@/components/ImageUploadField";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage, mediaUrl } from "@/lib/api";
import type { AdminCourier } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  vehicle: z.string().optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const RESOURCE = "couriers";
const INVALIDATE = ["couriers"];

const DEFAULTS: FormValues = {
  name: "",
  avatar: "",
  phone: "",
  vehicle: "",
  active: true,
};

export default function CouriersPage() {
  const { notify } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourier | null>(null);
  const [toDelete, setToDelete] = useState<AdminCourier | null>(null);

  const create = useCreate<AdminCourier, FormValues>(RESOURCE, INVALIDATE);
  const update = useUpdate<AdminCourier, FormValues>(RESOURCE, INVALIDATE);
  const remove = useRemove(RESOURCE, INVALIDATE);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const openCreate = () => {
    setEditing(null);
    reset(DEFAULTS);
    setOpen(true);
  };

  const openEdit = (row: AdminCourier) => {
    setEditing(row);
    reset({
      name: row.name,
      avatar: row.avatar ?? "",
      phone: row.phone ?? "",
      vehicle: row.vehicle ?? "",
      active: row.active,
    });
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: values });
        notify("Courier updated");
      } else {
        await create.mutateAsync(values);
        notify("Courier created");
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
      notify("Courier deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<AdminCourier>[] = [
    {
      field: "avatar",
      headerName: "",
      width: 72,
      sortable: false,
      renderCell: (p) => (
        <Avatar src={mediaUrl(p.value) || undefined} sx={{ width: 36, height: 36 }}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    { field: "phone", headerName: "Phone", width: 160 },
    { field: "vehicle", headerName: "Vehicle", flex: 1, minWidth: 140 },
    { field: "active", headerName: "Active", type: "boolean", width: 100 },
  ];

  return (
    <>
      <CrudDataGrid<AdminCourier>
        title="Couriers"
        resource={RESOURCE}
        queryKey="couriers"
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={setToDelete}
        addLabel="Add courier"
        searchPlaceholder="Search couriers…"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit courier" : "New courier"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Controller
                control={control}
                name="avatar"
                render={({ field }) => (
                  <ImageUploadField
                    label="Avatar"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <TextField
                label="Name"
                fullWidth
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <TextField label="Phone" fullWidth {...register("phone")} />
              <TextField label="Vehicle" fullWidth {...register("vehicle")} />
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Active"
                  />
                )}
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
        title="Delete courier"
        message={`Delete "${toDelete?.name}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
