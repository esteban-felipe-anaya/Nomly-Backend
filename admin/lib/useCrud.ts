"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type { Paginated } from "./types";

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [k: string]: string | number | undefined;
}

function cleanParams(params: ListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) out[k] = v;
  });
  return out;
}

export function useList<T>(
  resource: string,
  keyBase: string,
  params: ListParams,
) {
  return useQuery({
    queryKey: [keyBase, params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<T>>(`/admin-api/${resource}`, {
        params: cleanParams(params),
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreate<T, Body = Partial<T>>(
  resource: string,
  invalidateKeys: string[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Body) => {
      const { data } = await api.post<T>(`/admin-api/${resource}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useUpdate<T, Body = Partial<T>>(
  resource: string,
  invalidateKeys: string[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string | number; body: Body }) => {
      const { data } = await api.put<T>(`/admin-api/${resource}/${id}`, body);
      return data;
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useRemove(resource: string, invalidateKeys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/admin-api/${resource}/${id}`);
      return id;
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
