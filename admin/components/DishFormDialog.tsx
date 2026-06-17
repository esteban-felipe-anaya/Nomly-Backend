"use client";

import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import CustomizationEditor from "@/components/CustomizationEditor";
import ImagePreview from "@/components/ImagePreview";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage } from "@/lib/api";
import type {
  CustomizationGroup,
  Dish,
  MenuCategory,
  Restaurant,
} from "@/lib/types";
import { useCreate, useUpdate } from "@/lib/useCrud";

const RESOURCE = "dishes";
const INVALIDATE = ["dishes"];

interface DishFormState {
  restaurant: string;
  category: number | null;
  name: string;
  description: string;
  price: string;
  currency: string;
  image: string;
  popular: boolean;
  customization: CustomizationGroup[];
}

const EMPTY: DishFormState = {
  restaurant: "",
  category: null,
  name: "",
  description: "",
  price: "0",
  currency: "USD",
  image: "",
  popular: false,
  customization: [],
};

interface DishFormDialogProps {
  open: boolean;
  editing: Dish | null;
  onClose: () => void;
  restaurants: Pick<Restaurant, "id" | "name">[];
  /** When set, restaurant is locked to this id (menu-management context). */
  lockedRestaurantId?: string;
  categories?: MenuCategory[];
}

export default function DishFormDialog({
  open,
  editing,
  onClose,
  restaurants,
  lockedRestaurantId,
  categories = [],
}: DishFormDialogProps) {
  const { notify } = useSnackbar();
  const create = useCreate<Dish, Record<string, unknown>>(RESOURCE, INVALIDATE);
  const update = useUpdate<Dish, Record<string, unknown>>(RESOURCE, INVALIDATE);
  const [form, setForm] = useState<DishFormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        restaurant: editing.restaurant,
        category: editing.category,
        name: editing.name,
        description: editing.description ?? "",
        price: String(editing.price),
        currency: editing.currency || "USD",
        image: editing.image ?? "",
        popular: editing.popular,
        customization: editing.customization ?? [],
      });
    } else {
      setForm({ ...EMPTY, restaurant: lockedRestaurantId ?? "" });
    }
  }, [open, editing, lockedRestaurantId]);

  const set = <K extends keyof DishFormState>(k: K, v: DishFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.restaurant) {
      setError("Restaurant is required");
      return;
    }
    const body = {
      restaurant: form.restaurant,
      category: form.category,
      name: form.name,
      description: form.description,
      price: Number(form.price) || 0,
      currency: form.currency || "USD",
      image: form.image,
      popular: form.popular,
      customization: form.customization.map((g, gi) => ({
        name: g.name,
        type: g.type,
        required: g.required,
        order: gi,
        options: g.options.map((o, oi) => ({
          name: o.name,
          price_delta: Number(o.price_delta) || 0,
          order: oi,
        })),
      })),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body });
        notify("Dish updated");
      } else {
        await create.mutateAsync(body);
        notify("Dish created");
      }
      onClose();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setError(msg);
      notify(msg, "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? "Edit dish" : "New dish"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!lockedRestaurantId && (
            <Autocomplete
              options={restaurants}
              getOptionLabel={(o) => o.name}
              value={restaurants.find((r) => r.id === form.restaurant) ?? null}
              onChange={(_, v) => set("restaurant", v?.id ?? "")}
              renderInput={(params) => (
                <TextField {...params} label="Restaurant" required />
              )}
            />
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <TextField
              label="Price"
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              sx={{ width: { sm: 140 } }}
            />
            <TextField
              label="Currency"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              sx={{ width: { sm: 120 } }}
            />
          </Stack>
          {categories.length > 0 && (
            <TextField
              label="Category"
              select
              value={form.category ?? ""}
              onChange={(e) =>
                set("category", e.target.value ? Number(e.target.value) : null)
              }
            >
              <MenuItem value="">None</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <TextField
            label="Image URL"
            fullWidth
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
          />
          <ImagePreview url={form.image} />
          <FormControlLabel
            control={
              <Switch
                checked={form.popular}
                onChange={(e) => set("popular", e.target.checked)}
              />
            }
            label="Popular"
          />
          <Divider />
          <CustomizationEditor
            value={form.customization}
            onChange={(v) => set("customization", v)}
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
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={create.isPending || update.isPending}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
