export const queryKeys = {
  stats: ["stats"] as const,
  cuisines: (params?: unknown) => ["cuisines", params] as const,
  cuisinesAll: ["cuisines", "all"] as const,
  restaurants: (params?: unknown) => ["restaurants", params] as const,
  restaurant: (id: string) => ["restaurants", "detail", id] as const,
  dishes: (params?: unknown) => ["dishes", params] as const,
  menuCategories: (params?: unknown) => ["menu-categories", params] as const,
  banners: (params?: unknown) => ["banners", params] as const,
  promos: (params?: unknown) => ["promos", params] as const,
  users: (params?: unknown) => ["users", params] as const,
  orders: (params?: unknown) => ["orders", params] as const,
  notifications: (params?: unknown) => ["notifications", params] as const,
};
