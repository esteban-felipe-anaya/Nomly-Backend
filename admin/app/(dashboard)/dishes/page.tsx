"use client";

import {
  Autocomplete,
  Avatar,
  Chip,
  TextField,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import CrudDataGrid from "@/components/CrudDataGrid";
import DishFormDialog from "@/components/DishFormDialog";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage } from "@/lib/api";
import type { Dish } from "@/lib/types";
import { useRemove } from "@/lib/useCrud";
import { useAllRestaurants } from "@/lib/useCuisines";

const RESOURCE = "dishes";
const INVALIDATE = ["dishes"];

export default function DishesPage() {
  const { notify } = useSnackbar();
  const { data: restaurants = [] } = useAllRestaurants();
  const [restaurantFilter, setRestaurantFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [toDelete, setToDelete] = useState<Dish | null>(null);

  const remove = useRemove(RESOURCE, INVALIDATE);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: Dish) => {
    setEditing(row);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      notify("Dish deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setToDelete(null);
    }
  };

  const columns: GridColDef<Dish>[] = [
    {
      field: "image",
      headerName: "",
      width: 64,
      sortable: false,
      renderCell: (p) => (
        <Avatar variant="rounded" src={p.value || undefined}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    {
      field: "restaurant_name",
      headerName: "Restaurant",
      flex: 1,
      minWidth: 150,
      sortable: false,
    },
    {
      field: "price",
      headerName: "Price",
      width: 110,
      type: "number",
      valueFormatter: (value: number, row) =>
        `${row.currency || "USD"} ${value}`,
    },
    {
      field: "popular",
      headerName: "Popular",
      width: 110,
      renderCell: (p) =>
        p.value ? <Chip size="small" color="primary" label="Popular" /> : null,
    },
  ];

  return (
    <>
      <CrudDataGrid<Dish>
        title="Dishes"
        resource={RESOURCE}
        queryKey="dishes"
        columns={columns}
        extraParams={{ restaurant: restaurantFilter || undefined }}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={setToDelete}
        addLabel="Add dish"
        searchPlaceholder="Search dishes…"
        toolbarExtra={
          <Autocomplete
            size="small"
            sx={{ width: 220 }}
            options={restaurants}
            getOptionLabel={(o) => o.name}
            value={restaurants.find((r) => r.id === restaurantFilter) ?? null}
            onChange={(_, v) => setRestaurantFilter(v?.id ?? "")}
            renderInput={(params) => (
              <TextField {...params} placeholder="Filter by restaurant" />
            )}
          />
        }
      />

      <DishFormDialog
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        restaurants={restaurants}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete dish"
        message={`Delete "${toDelete?.name}"?`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
