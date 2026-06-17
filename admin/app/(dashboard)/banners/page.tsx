"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import ImagePreview from "@/components/ImagePreview";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage } from "@/lib/api";
import type { Banner } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";
import { useAllRestaurants } from "@/lib/useCuisines";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  restaurant: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

const RESOURCE = "banners";
const INVALIDATE = ["banners"];

export default function BannersPage() {
  const { notify } = useSnackbar();
  const { data: restaurants = [] } = useAllRestaurants();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);

  const create = useCreate<Banner, FormValues>(RESOURCE, INVALIDATE);
  const update = useUpdate<Banner, FormValues>(RESOURCE, INVALIDATE);
  const remove = useRemove(RESOURCE, INVALIDATE);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", subtitle: "", image: "", restaurant: null },
  });

  const imageUrl = watch("image");

  const openCreate = () => {
    setEditing(null);
    reset({ title: "", subtitle: "", image: "", restaurant: null });
    setOpen(true);
  };

  const openEdit = (row: Banner) => {
    setEditing(row);
    reset({
      title: row.title,
      subtitle: row.subtitle ?? "",
      image: row.image ?? "",
      restaurant: row.restaurant ?? null,
    });
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const body = { ...values, restaurant: values.restaurant || null };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        notify("Banner updated");
      } else {
        await create.mutateAsync(body);
        notify("Banner created");
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
      notify("Banner deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<Banner>[] = [
    { field: "title", headerName: "Title", flex: 1, minWidth: 180 },
    { field: "subtitle", headerName: "Subtitle", flex: 1, minWidth: 180 },
    {
      field: "restaurant",
      headerName: "Restaurant",
      width: 180,
      valueGetter: (value) =>
        restaurants.find((r) => r.id === value)?.name ?? value ?? "—",
    },
  ];

  return (
    <>
      <CrudDataGrid<Banner>
        title="Banners"
        resource={RESOURCE}
        queryKey="banners"
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={setToDelete}
        addLabel="Add banner"
        searchPlaceholder="Search banners…"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit banner" : "New banner"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Title"
                fullWidth
                {...register("title")}
                error={!!errors.title}
                helperText={errors.title?.message}
              />
              <TextField label="Subtitle" fullWidth {...register("subtitle")} />
              <TextField label="Image URL" fullWidth {...register("image")} />
              <ImagePreview url={imageUrl} />
              <Controller
                control={control}
                name="restaurant"
                render={({ field }) => (
                  <Autocomplete
                    options={restaurants}
                    getOptionLabel={(o) => o.name}
                    value={
                      restaurants.find((r) => r.id === field.value) ?? null
                    }
                    onChange={(_, v) => field.onChange(v?.id ?? null)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Linked restaurant (optional)"
                      />
                    )}
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
        title="Delete banner"
        message={`Delete "${toDelete?.title}"?`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
