"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useList, type ListParams } from "@/lib/useCrud";

export interface CrudDataGridProps<T extends { id: string | number }> {
  title: string;
  resource: string;
  queryKey: string;
  columns: GridColDef<T>[];
  extraParams?: Record<string, string | number | undefined>;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  addLabel?: string;
  readOnly?: boolean;
  toolbarExtra?: React.ReactNode;
}

export default function CrudDataGrid<T extends { id: string | number }>({
  title,
  resource,
  queryKey,
  columns,
  extraParams,
  onAdd,
  onEdit,
  onDelete,
  onRowClick,
  searchPlaceholder = "Search…",
  addLabel = "Add",
  readOnly = false,
  toolbarExtra,
}: CrudDataGridProps<T>) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPaginationModel((p) => ({ ...p, page: 0 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const ordering = useMemo(() => {
    if (!sortModel.length) return undefined;
    const { field, sort } = sortModel[0];
    return sort === "desc" ? `-${field}` : field;
  }, [sortModel]);

  const params: ListParams = {
    page: paginationModel.page + 1,
    page_size: paginationModel.pageSize,
    search: debounced || undefined,
    ordering,
    ...extraParams,
  };

  const { data, isLoading, isFetching } = useList<T>(
    resource,
    queryKey,
    params,
  );

  const actionColumn: GridColDef<T> = {
    field: "__actions",
    type: "actions",
    headerName: "",
    width: 90,
    getActions: (p: GridRowParams<T>) => {
      const items = [];
      if (onEdit) {
        items.push(
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            onClick={() => onEdit(p.row)}
          />,
        );
      }
      if (onDelete) {
        items.push(
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => onDelete(p.row)}
          />,
        );
      }
      return items;
    },
  };

  const allColumns = readOnly ? columns : [...columns, actionColumn];

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography variant="h4">{title}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {toolbarExtra}
          {!readOnly && onAdd && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
              {addLabel}
            </Button>
          )}
        </Stack>
      </Stack>

      <DataGrid<T>
        rows={data?.results ?? []}
        columns={allColumns}
        getRowId={(row) => row.id}
        rowCount={data?.count ?? 0}
        loading={isLoading || isFetching}
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        onRowClick={onRowClick ? (p) => onRowClick(p.row) : undefined}
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          "& .MuiDataGrid-row": { cursor: onRowClick ? "pointer" : "default" },
          minHeight: 400,
        }}
      />
    </Box>
  );
}
