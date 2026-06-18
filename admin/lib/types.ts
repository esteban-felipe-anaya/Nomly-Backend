export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
}

export interface LoginResponse {
  token: string;
  refresh: string;
  user: AuthUser;
}

export interface Cuisine {
  id: string;
  name: string;
  icon?: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string | null;
  cuisine_name?: string | null;
  description?: string | null;
  cover?: string | null;
  logo?: string | null;
  rating: number;
  rating_count: number;
  delivery_minutes: number;
  delivery_fee: number;
  price_level: number;
  free_delivery: boolean;
  offers: string[];
  distance_km?: number | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

export interface CustomizationOption {
  id?: number;
  name: string;
  price_delta: number;
  order: number;
}

export interface CustomizationGroup {
  id?: number;
  name: string;
  type: "single" | "multi";
  required: boolean;
  order: number;
  options: CustomizationOption[];
}

export interface Dish {
  id: string;
  restaurant: string;
  restaurant_name?: string | null;
  category: number | null;
  category_name?: string | null;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  image?: string | null;
  popular: boolean;
  customization: CustomizationGroup[];
}

export interface MenuCategory {
  id: number;
  restaurant: string;
  name: string;
  order: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  restaurant?: string | null;
}

export interface Promo {
  id: string;
  code: string;
  discount_pct: number;
  free_delivery: boolean;
  min_subtotal: number;
  description?: string | null;
  active: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  line2?: string | null;
  city?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
}

export interface AddressInput {
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface AdminCourier {
  id: string;
  name: string;
  avatar?: string | null;
  phone?: string | null;
  vehicle?: string | null;
  active: boolean;
}

export type OrderStatus =
  | "confirmed"
  | "preparing"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id?: number;
  dish?: string | null;
  name: string;
  image?: string | null;
  unit_price: number;
  quantity: number;
  selected_options?: unknown;
  instructions?: string | null;
  line_total: number;
}

export interface Order {
  id: string;
  user?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  restaurant?: string | null;
  restaurant_name?: string | null;
  address?: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  promo_code?: string | null;
  payment_method?: string | null;
  scheduled_for?: string | null;
  placed_at: string;
  eta_minutes?: number | null;
  items: OrderItem[];
}

export type NotificationType = "offer" | "order" | "system" | string;

export interface NotificationItem {
  id: string;
  user?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  date: string;
}

export interface Stats {
  ordersToday: number;
  revenueTotal: number;
  revenueToday: number;
  activeOrders: number;
  avgDeliveryMinutes: number;
  ordersOverTime: { date: string; orders: number }[];
  revenueByCuisine: { cuisine: string; revenue: number; orders: number }[];
  topRestaurants: { name: string; orders: number; revenue: number }[];
}
