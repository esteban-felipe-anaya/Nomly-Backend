"use client";

import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Chip } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { OrderStatus } from "./types";

type ChipColor =
  | "default"
  | "info"
  | "warning"
  | "secondary"
  | "primary"
  | "success"
  | "error";

interface StatusMeta {
  label: string;
  color: ChipColor;
  icon: SvgIconComponent;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
];

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  confirmed: { label: "Confirmed", color: "info", icon: CheckCircleOutlineIcon },
  preparing: { label: "Preparing", color: "warning", icon: RestaurantIcon },
  picked_up: { label: "Picked up", color: "secondary", icon: ShoppingBagIcon },
  on_the_way: { label: "On the way", color: "primary", icon: DeliveryDiningIcon },
  delivered: { label: "Delivered", color: "success", icon: TaskAltIcon },
  cancelled: { label: "Cancelled", color: "error", icon: CancelIcon },
};

const FALLBACK: StatusMeta = {
  label: "Unknown",
  color: "default",
  icon: CheckCircleOutlineIcon,
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status as OrderStatus] ?? FALLBACK;
}

export function statusLabel(status: string): string {
  return statusMeta(status).label;
}

/** Colored status chip with a status-specific icon. */
export function StatusChip({
  status,
  size = "small",
}: {
  status: string;
  size?: "small" | "medium";
}) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <Chip
      size={size}
      color={meta.color}
      icon={<Icon />}
      label={meta.label}
    />
  );
}
