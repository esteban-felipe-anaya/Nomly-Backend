"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { queryKeys } from "./queryKeys";
import type { Cuisine, Paginated } from "./types";

export function useAllCuisines() {
  return useQuery({
    queryKey: queryKeys.cuisinesAll,
    queryFn: async () => {
      const { data } = await api.get<Paginated<Cuisine>>("/admin-api/cuisines", {
        params: { page_size: 500, ordering: "name" },
      });
      return data.results;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllRestaurants() {
  return useQuery({
    queryKey: ["restaurants", "all"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<{ id: string; name: string }>>(
        "/admin-api/restaurants",
        { params: { page_size: 500, ordering: "name" } },
      );
      return data.results;
    },
    staleTime: 5 * 60_000,
  });
}
