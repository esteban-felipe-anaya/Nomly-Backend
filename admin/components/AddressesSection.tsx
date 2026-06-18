"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import {
  apiErrorMessage,
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "@/lib/api";
import type { Address, AddressInput } from "@/lib/types";

const schema = z.object({
  label: z.string().min(1, "Label is required"),
  line1: z.string().min(1, "Address line is required"),
  line2: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const ADDRESSES_KEY = ["addresses"] as const;

const EMPTY: FormValues = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  notes: "",
  isDefault: false,
};

function composeLine(a: Address): string {
  return [a.line1, a.line2, a.city].filter(Boolean).join(", ");
}

/** Addresses manager for the logged-in user, embedded in the profile dialog. */
export default function AddressesSection() {
  const { notify } = useSnackbar();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [toDelete, setToDelete] = useState<Address | null>(null);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: listAddresses,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ADDRESSES_KEY });

  const save = useMutation({
    mutationFn: (vars: { id?: string; body: AddressInput }) =>
      vars.id ? updateAddress(vars.id, vars.body) : createAddress(vars.body),
    onSuccess: () => {
      invalidate();
      notify(editing ? "Address updated" : "Address added");
      setFormOpen(false);
    },
    onError: (err) => notify(apiErrorMessage(err), "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      invalidate();
      notify("Address deleted");
      setToDelete(null);
    },
    onError: (err) => notify(apiErrorMessage(err), "error"),
  });

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    reset({
      label: a.label,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city ?? "",
      notes: a.notes ?? "",
      isDefault: a.isDefault,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const body: AddressInput = {
      label: values.label,
      line1: values.line1,
      line2: values.line2 || undefined,
      city: values.city || undefined,
      notes: values.notes || undefined,
      isDefault: values.isDefault,
    };
    save.mutate({ id: editing?.id, body });
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Addresses
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
          Add address
        </Button>
      </Stack>

      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : addresses.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No saved addresses yet.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {addresses.map((a) => (
            <Paper
              key={a.id}
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                borderRadius: 2,
              }}
            >
              <LocationOnIcon color="action" sx={{ mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="subtitle2" noWrap>
                    {a.label}
                  </Typography>
                  {a.isDefault && (
                    <Chip label="Default" size="small" color="primary" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {composeLine(a)}
                </Typography>
                {a.notes && (
                  <Typography variant="caption" color="text.disabled">
                    {a.notes}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => openEdit(a)}
                    aria-label="Edit address"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setToDelete(a)}
                    aria-label="Delete address"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Label"
                fullWidth
                placeholder="Home, Work…"
                {...register("label")}
                error={!!errors.label}
                helperText={errors.label?.message}
              />
              <TextField
                label="Address line 1"
                fullWidth
                {...register("line1")}
                error={!!errors.line1}
                helperText={errors.line1?.message}
              />
              <TextField label="Address line 2" fullWidth {...register("line2")} />
              <TextField label="City" fullWidth {...register("city")} />
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                {...register("notes")}
              />
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Set as default"
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete address"
        message={`Delete "${toDelete?.label}"? This cannot be undone.`}
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}
