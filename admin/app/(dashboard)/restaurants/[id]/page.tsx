"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DishFormDialog from "@/components/DishFormDialog";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { api, apiErrorMessage } from "@/lib/api";
import type { Dish, MenuCategory, Paginated, Restaurant } from "@/lib/types";
import { useCreate, useRemove, useUpdate } from "@/lib/useCrud";

export default function RestaurantMenuPage() {
  const params = useParams();
  const id = String(params.id);
  const { notify } = useSnackbar();

  const restaurantQuery = useQuery({
    queryKey: ["restaurants", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<Restaurant>(`/admin-api/restaurants/${id}`);
      return data;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["menu-categories", { restaurant: id }],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MenuCategory>>(
        "/admin-api/menu-categories",
        { params: { restaurant: id, page_size: 500, ordering: "order" } },
      );
      return data.results;
    },
  });

  const dishesQuery = useQuery({
    queryKey: ["dishes", { restaurant: id, all: true }],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Dish>>("/admin-api/dishes", {
        params: { restaurant: id, page_size: 500 },
      });
      return data.results;
    },
  });

  // Dish dialog
  const [dishOpen, setDishOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);
  const removeDish = useRemove("dishes", ["dishes"]);

  // Category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState("0");
  const [catToDelete, setCatToDelete] = useState<MenuCategory | null>(null);
  const createCat = useCreate<MenuCategory, Record<string, unknown>>(
    "menu-categories",
    ["menu-categories"],
  );
  const updateCat = useUpdate<MenuCategory, Record<string, unknown>>(
    "menu-categories",
    ["menu-categories"],
  );
  const removeCat = useRemove("menu-categories", ["menu-categories"]);

  const restaurant = restaurantQuery.data;
  const categories = categoriesQuery.data ?? [];
  const dishes = dishesQuery.data ?? [];

  const openCreateCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatOrder(String(categories.length));
    setCatOpen(true);
  };
  const openEditCat = (c: MenuCategory) => {
    setEditingCat(c);
    setCatName(c.name);
    setCatOrder(String(c.order));
    setCatOpen(true);
  };
  const submitCat = async () => {
    const body = {
      restaurant: id,
      name: catName,
      order: Number(catOrder) || 0,
    };
    try {
      if (editingCat) {
        await updateCat.mutateAsync({ id: editingCat.id, body });
        notify("Category updated");
      } else {
        await createCat.mutateAsync(body);
        notify("Category created");
      }
      setCatOpen(false);
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    }
  };
  const confirmDeleteCat = async () => {
    if (!catToDelete) return;
    try {
      await removeCat.mutateAsync(catToDelete.id);
      notify("Category deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setCatToDelete(null);
    }
  };

  const confirmDeleteDish = async () => {
    if (!dishToDelete) return;
    try {
      await removeDish.mutateAsync(dishToDelete.id);
      notify("Dish deleted");
    } catch (err) {
      notify(apiErrorMessage(err), "error");
    } finally {
      setDishToDelete(null);
    }
  };

  const categoryName = (catId: number | null) =>
    categories.find((c) => c.id === catId)?.name;

  if (restaurantQuery.isError) {
    return <Alert severity="error">Restaurant not found.</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton component={Link} href="/restaurants">
          <ArrowBackIcon />
        </IconButton>
        {restaurant ? (
          <>
            <Avatar src={restaurant.logo || restaurant.cover || undefined}>
              {restaurant.name[0]}
            </Avatar>
            <Box>
              <Typography variant="h4">{restaurant.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Menu management · {restaurant.cuisine_name ?? "No cuisine"}
              </Typography>
            </Box>
          </>
        ) : (
          <Skeleton variant="text" width={240} height={48} />
        )}
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
        <Card sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6">Menu categories</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={openCreateCat}>
                Add
              </Button>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {categoriesQuery.isLoading ? (
              <Skeleton variant="rounded" height={120} />
            ) : categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No categories yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {categories.map((c) => (
                  <ListItem
                    key={c.id}
                    secondaryAction={
                      <Stack direction="row">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEditCat(c)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setCatToDelete(c)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemText primary={c.name} secondary={`Order ${c.order}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, width: "100%" }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="h6">Dishes ({dishes.length})</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingDish(null);
                  setDishOpen(true);
                }}
              >
                Add dish
              </Button>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {dishesQuery.isLoading ? (
              <Skeleton variant="rounded" height={200} />
            ) : dishes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No dishes yet.
              </Typography>
            ) : (
              <List disablePadding>
                {dishes.map((d) => (
                  <ListItem
                    key={d.id}
                    secondaryAction={
                      <Stack direction="row">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditingDish(d);
                            setDishOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDishToDelete(d)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar variant="rounded" src={d.image || undefined}>
                        {d.name[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{d.name}</span>
                          {d.popular && (
                            <Chip size="small" color="primary" label="Popular" />
                          )}
                          {categoryName(d.category) && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={categoryName(d.category)}
                            />
                          )}
                        </Stack>
                      }
                      secondary={`${d.currency || "USD"} ${d.price}${
                        d.customization?.length
                          ? ` · ${d.customization.length} option group(s)`
                          : ""
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>

      <DishFormDialog
        open={dishOpen}
        editing={editingDish}
        onClose={() => setDishOpen(false)}
        restaurants={restaurant ? [restaurant] : []}
        lockedRestaurantId={id}
        categories={categories}
      />

      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingCat ? "Edit category" : "New category"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <TextField
              label="Order"
              type="number"
              fullWidth
              value={catOrder}
              onChange={(e) => setCatOrder(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitCat}
            disabled={createCat.isPending || updateCat.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!dishToDelete}
        title="Delete dish"
        message={`Delete "${dishToDelete?.name}"?`}
        loading={removeDish.isPending}
        onConfirm={confirmDeleteDish}
        onCancel={() => setDishToDelete(null)}
      />
      <ConfirmDialog
        open={!!catToDelete}
        title="Delete category"
        message={`Delete "${catToDelete?.name}"?`}
        loading={removeCat.isPending}
        onConfirm={confirmDeleteCat}
        onCancel={() => setCatToDelete(null)}
      />
    </Box>
  );
}
