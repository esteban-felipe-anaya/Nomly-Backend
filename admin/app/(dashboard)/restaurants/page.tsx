"use client";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Autocomplete,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Rating,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import {
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import ImageUploadField from "@/components/ImageUploadField";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage, mediaUrl } from "@/lib/api";
import type { Restaurant } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";
import { useAllCuisines } from "@/lib/useCuisines";

const RESOURCE = "restaurants";
const INVALIDATE = ["restaurants"];

interface FormState {
  name: string;
  cuisine: string | null;
  description: string;
  cover: string;
  logo: string;
  rating: number;
  delivery_minutes: string;
  delivery_fee: string;
  price_level: number;
  free_delivery: boolean;
  address: string;
}

const EMPTY: FormState = {
  name: "",
  cuisine: null,
  description: "",
  cover: "",
  logo: "",
  rating: 0,
  delivery_minutes: "30",
  delivery_fee: "0",
  price_level: 1,
  free_delivery: false,
  address: "",
};

export default function RestaurantsPage() {
  const router = useRouter();
  const { notify } = useSnackbar();
  const { data: cuisines = [] } = useAllCuisines();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [toDelete, setToDelete] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const create = useCreate<Restaurant, Record<string, unknown>>(
    RESOURCE,
    INVALIDATE,
  );
  const update = useUpdate<Restaurant, Record<string, unknown>>(
    RESOURCE,
    INVALIDATE,
  );
  const remove = useRemove(RESOURCE, INVALIDATE);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        name: editing.name,
        cuisine: editing.cuisine,
        description: editing.description ?? "",
        cover: editing.cover ?? "",
        logo: editing.logo ?? "",
        rating: editing.rating,
        delivery_minutes: String(editing.delivery_minutes),
        delivery_fee: String(editing.delivery_fee),
        price_level: editing.price_level,
        free_delivery: editing.free_delivery,
        address: editing.address ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const body = {
      name: form.name,
      cuisine: form.cuisine,
      description: form.description,
      cover: form.cover,
      logo: form.logo,
      rating: form.rating,
      delivery_minutes: Number(form.delivery_minutes) || 0,
      delivery_fee: Number(form.delivery_fee) || 0,
      price_level: form.price_level,
      free_delivery: form.free_delivery,
      address: form.address,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        notify("Restaurant updated");
      } else {
        await create.mutateAsync(body);
        notify("Restaurant created");
      }
      setOpen(false);
    } catch (err) {
      const msg = apiErrorMessage(err);
      setError(msg);
      notify(msg, "error");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      notify("Restaurant deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<Restaurant>[] = [
    {
      field: "logo",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <Avatar src={mediaUrl(p.value || p.row.cover) || undefined}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    {
      field: "cuisine_name",
      headerName: "Cuisine",
      width: 140,
      sortable: false,
    },
    { field: "rating", headerName: "Rating", width: 100, type: "number" },
    {
      field: "delivery_minutes",
      headerName: "Delivery (min)",
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
      field: "__menu",
      type: "actions",
      headerName: "Menu",
      width: 80,
      getActions: (p) => [
        <GridActionsCellItem
          key="menu"
          icon={<OpenInNewIcon color="info" />}
          label="Manage menu"
          onClick={() => router.push(`/restaurants/${p.row.id}`)}
        />,
      ],
    },
  ];

  return (
    <>
      <CrudDataGrid<Restaurant>
        title="Restaurants"
        resource={RESOURCE}
        queryKey="restaurants"
        columns={columns}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={setToDelete}
        onRowClick={(row) => router.push(`/restaurants/${row.id}`)}
        addLabel="Add restaurant"
        searchPlaceholder="Search restaurants…"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? "Edit restaurant" : "New restaurant"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Name"
                fullWidth
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <Autocomplete
                sx={{ minWidth: 220, flex: 1 }}
                options={cuisines}
                getOptionLabel={(o) => o.name}
                value={cuisines.find((c) => c.id === form.cuisine) ?? null}
                onChange={(_, v) => set("cuisine", v?.id ?? null)}
                renderInput={(params) => (
                  <TextField {...params} label="Cuisine" />
                )}
              />
            </Stack>
            <ImageUploadField
              label="Cover image"
              value={form.cover}
              onChange={(url) => set("cover", url)}
            />
            <ImageUploadField
              label="Logo image"
              value={form.logo}
              onChange={(url) => set("logo", url)}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Delivery minutes"
                type="number"
                fullWidth
                value={form.delivery_minutes}
                onChange={(e) => set("delivery_minutes", e.target.value)}
              />
              <TextField
                label="Delivery fee"
                type="number"
                fullWidth
                value={form.delivery_fee}
                onChange={(e) => set("delivery_fee", e.target.value)}
              />
              <TextField
                label="Price level (1-4)"
                type="number"
                fullWidth
                value={form.price_level}
                onChange={(e) =>
                  set("price_level", Number(e.target.value) || 1)
                }
              />
            </Stack>
            <Stack direction="row" spacing={3} alignItems="center">
              <Stack>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Rating</span>
                <Rating
                  value={form.rating}
                  precision={0.1}
                  onChange={(_, v) => set("rating", v ?? 0)}
                />
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.free_delivery}
                    onChange={(e) => set("free_delivery", e.target.checked)}
                  />
                }
                label="Free delivery"
              />
            </Stack>
            <TextField
              label="Address"
              fullWidth
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            {error && (
              <TextField
                error
                value={error}
                variant="standard"
                InputProps={{ readOnly: true, disableUnderline: true }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={create.isPending || update.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete restaurant"
        message={`Delete "${toDelete?.name}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
