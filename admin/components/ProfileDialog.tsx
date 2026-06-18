"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import AddressesSection from "@/components/AddressesSection";
import ImageUploadField from "@/components/ImageUploadField";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { apiErrorMessage, updateProfile } from "@/lib/api";
import { setUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 4, "Use at least 4 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileDialog({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
}) {
  const { notify } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ?? "",
      avatar: user.avatar ?? "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: values.name,
        phone: values.phone ?? "",
        avatar: values.avatar ?? "",
      };
      if (values.password) payload.password = values.password;
      const updated = await updateProfile(payload);
      setUser(updated);
      onSaved(updated);
      notify("Profile updated");
      onClose();
    } catch (e) {
      notify(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit profile</DialogTitle>
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
          <TextField label="Email" fullWidth value={user.email} disabled />
          <TextField label="Phone" fullWidth {...register("phone")} />
          <TextField
            label="New password"
            type="password"
            fullWidth
            placeholder="Leave blank to keep current"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Divider sx={{ my: 1 }} />
          <AddressesSection />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
