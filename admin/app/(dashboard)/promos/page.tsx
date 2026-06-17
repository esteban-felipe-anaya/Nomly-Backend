"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Chip,
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
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage } from "@/lib/api";
import type { Promo } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  discount_pct: z.coerce.number().min(0).max(100),
  min_subtotal: z.coerce.number().min(0),
  description: z.string().optional(),
  free_delivery: z.boolean(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const RESOURCE = "promos";
const INVALIDATE = ["promos"];

export default function PromosPage() {
  const { notify } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [toDelete, setToDelete] = useState<Promo | null>(null);

  const create = useCreate<Promo, FormValues>(RESOURCE, INVALIDATE);
  const update = useUpdate<Promo, FormValues>(RESOURCE, INVALIDATE);
  const remove = useRemove(RESOURCE, INVALIDATE);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      discount_pct: 0,
      min_subtotal: 0,
      description: "",
      free_delivery: false,
      active: true,
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      code: "",
      discount_pct: 0,
      min_subtotal: 0,
      description: "",
      free_delivery: false,
      active: true,
    });
    setOpen(true);
  };

  const openEdit = (row: Promo) => {
    setEditing(row);
    reset({
      code: row.code,
      discount_pct: row.discount_pct,
      min_subtotal: row.min_subtotal,
      description: row.description ?? "",
      free_delivery: row.free_delivery,
      active: row.active,
    });
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: values });
        notify("Promo updated");
      } else {
        await create.mutateAsync(values);
        notify("Promo created");
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
      notify("Promo deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<Promo>[] = [
    { field: "code", headerName: "Code", width: 160 },
    {
      field: "discount_pct",
      headerName: "Discount %",
      width: 120,
      type: "number",
    },
    {
      field: "min_subtotal",
      headerName: "Min subtotal",
      width: 130,
      type: "number",
    },
    {
      field: "free_delivery",
      headerName: "Free delivery",
      width: 130,
      type: "boolean",
    },
    {
      field: "active",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value ? "Active" : "Inactive"}
          color={p.value ? "success" : "default"}
        />
      ),
    },
    { field: "description", headerName: "Description", flex: 1, minWidth: 180 },
  ];

  return (
    <>
      <CrudDataGrid<Promo>
        title="Promos"
        resource={RESOURCE}
        queryKey="promos"
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={setToDelete}
        addLabel="Add promo"
        searchPlaceholder="Search promos…"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit promo" : "New promo"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Code"
                fullWidth
                {...register("code")}
                error={!!errors.code}
                helperText={errors.code?.message}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Discount %"
                  type="number"
                  fullWidth
                  {...register("discount_pct")}
                  error={!!errors.discount_pct}
                  helperText={errors.discount_pct?.message}
                />
                <TextField
                  label="Min subtotal"
                  type="number"
                  fullWidth
                  {...register("min_subtotal")}
                  error={!!errors.min_subtotal}
                  helperText={errors.min_subtotal?.message}
                />
              </Stack>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                {...register("description")}
              />
              <Stack direction="row" spacing={3}>
                <Controller
                  control={control}
                  name="free_delivery"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label="Free delivery"
                    />
                  )}
                />
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
        title="Delete promo"
        message={`Delete "${toDelete?.code}"?`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
