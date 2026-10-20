"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type {
  AdminCategoryParentOptionDto,
  AdminCategoryParentOptionsApiResponse,
} from "@/domains/admin/categories/types/api_responses";
import type {
  AdminProductMutationApiResponse,
  AdminProductsListApiResponse,
  AdminProductsListParams,
  AdminProductUpsertParams,
} from "@/domains/admin/products/types/api_params";
import {
  ADMIN_PRODUCT_BULK_ACTION,
  ADMIN_PRODUCT_SORT_DIRECTION,
  ADMIN_PRODUCT_SORT_FIELD,
  ADMIN_PRODUCT_STATUS_VALUES,
  type AdminProductBulkAction,
  type AdminProductDetailDto,
  type AdminProductListItemDto,
  type AdminProductSortDirection,
  type AdminProductSortField,
  type AdminProductStatus,
} from "@/domains/admin/products/types/product_dto";
import type { AdminProductErrorCode } from "@/domains/admin/products/types/product_errors";
import {
  AddOutlined,
  ArchiveOutlined,
  DeleteOutline,
  RestoreOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  NoSsr,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderCellParams,
  type GridRowSelectionModel,
  type GridSortModel,
} from "@mui/x-data-grid";
import { useRouter, useSearchParams } from "next/navigation";
import { enqueueSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import {
  productsListViewUrl,
  productWorkspaceHref,
  readProductsListView,
  type ProductWorkspaceSection,
} from "../services/product_workspace_links";
import { ProductFormDialog } from "./product_form_dialog";
import { ProductSellabilityWarnings } from "./product_sellability_warnings";

const ADMIN_PRODUCTS_REQUEST_ID = "admin-products-list";
const ADMIN_PRODUCT_CATEGORY_OPTIONS_REQUEST_ID =
  "admin-products-category-options";
const ADMIN_PRODUCT_PAGE_SIZE_OPTIONS = [10, 25, 50];
const FEATURED_FILTER = {
  all: "all",
  yes: "yes",
  no: "no",
} as const;

type FeaturedFilter = (typeof FEATURED_FILTER)[keyof typeof FEATURED_FILTER];

interface AdminProductsPageProps {
  dictionary: Dictionary;
}

interface BulkDialogState {
  action: AdminProductBulkAction;
}

function isSupportedSortField(field: string): field is AdminProductSortField {
  return Object.values(ADMIN_PRODUCT_SORT_FIELD).some(
    (value) => value === field,
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function getStatusLabel(
  dictionary: Dictionary,
  status: AdminProductStatus,
): string {
  return dictionary.admin.products.status[status];
}

function getCategoriesLabel(product: AdminProductListItemDto): string {
  return product.categories.map((category) => category.name).join(", ");
}

function getWarningsLabel(
  dictionary: Dictionary,
  warnings: AdminProductErrorCode[],
): string {
  const warningMessages = dictionary.admin.products.warnings as Record<
    string,
    string
  >;

  return warnings
    .map((warning) => warningMessages[warning] ?? warning)
    .join(" | ");
}

function resolveProductFeedbackMessage(
  dictionary: Dictionary,
  error: unknown,
): string {
  const message = error instanceof Error ? error.message : undefined;
  const feedbackMessages = dictionary.admin.products.feedback as Record<
    string,
    string
  >;

  return (
    (message ? feedbackMessages[message] : undefined) ??
    dictionary.admin.products.feedback.saveError
  );
}

function createProductListParams({
  page,
  pageSize,
  search,
  status,
  categoryId,
  brand,
  featured,
  inTrash,
  stock,
  discounted,
  sortField,
  sortDirection,
}: {
  page: number;
  pageSize: number;
  search: string;
  status: AdminProductStatus | "all";
  categoryId: string;
  brand: string;
  featured: FeaturedFilter;
  inTrash: boolean;
  stock: NonNullable<AdminProductsListParams["stock"]>;
  discounted: FeaturedFilter;
  sortField: AdminProductSortField;
  sortDirection: AdminProductSortDirection;
}): AdminProductsListParams {
  return {
    page,
    pageSize,
    search,
    status,
    ...(categoryId.trim() ? { categoryId: categoryId.trim() } : {}),
    ...(brand.trim() ? { brand: brand.trim() } : {}),
    ...(featured === FEATURED_FILTER.yes ? { featured: true } : {}),
    ...(featured === FEATURED_FILTER.no ? { featured: false } : {}),
    inTrash,
    stock,
    ...(discounted !== "all" ? { discounted: discounted === "yes" } : {}),
    sortField,
    sortDirection,
  };
}

export function AdminProductsPage({ dictionary }: AdminProductsPageProps) {
  const { cancellableApi, abort } = useCancellableApiContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialView] = useState(() => readProductsListView(searchParams));
  const [rows, setRows] = useState<AdminProductListItemDto[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<
    AdminCategoryParentOptionDto[]
  >([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(initialView.page);
  const [pageSize, setPageSize] = useState<number>(initialView.pageSize);
  const [search, setSearch] = useState(initialView.search);
  const [status, setStatus] = useState<AdminProductStatus | "all">(
    initialView.status,
  );
  const [categoryId, setCategoryId] = useState(initialView.categoryId);
  const [brand, setBrand] = useState(initialView.brand);
  const [featured, setFeatured] = useState<FeaturedFilter>(
    initialView.featured,
  );
  const [inTrash, setInTrash] = useState(initialView.inTrash);
  const [stock, setStock] = useState<
    NonNullable<AdminProductsListParams["stock"]>
  >(initialView.stock);
  const [discounted, setDiscounted] = useState<FeaturedFilter>(
    initialView.discounted,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshProducts = (): void => setRefreshKey((value) => value + 1);
  const [sortField, setSortField] = useState<AdminProductSortField>(
    initialView.sortField,
  );
  const [sortDirection, setSortDirection] = useState<AdminProductSortDirection>(
    initialView.sortDirection,
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const gridSortModel = useMemo<GridSortModel>(
    () => [{ field: sortField, sort: sortDirection }],
    [sortField, sortDirection],
  );
  const gridPaginationModel = useMemo(
    () => ({ page, pageSize }),
    [page, pageSize],
  );
  const gridSelectionModel = useMemo<GridRowSelectionModel>(
    () => ({ type: "include", ids: new Set(selectedRows) }),
    [selectedRows],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<AdminProductDetailDto | null>(null);
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const url = productsListViewUrl({
      page,
      pageSize,
      search,
      status,
      categoryId,
      brand,
      featured,
      inTrash,
      stock,
      discounted,
      sortField,
      sortDirection,
    });
    window.history.replaceState(window.history.state, "", url);
  }, [
    page,
    pageSize,
    search,
    status,
    categoryId,
    brand,
    featured,
    inTrash,
    stock,
    discounted,
    sortField,
    sortDirection,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await cancellableApi.get<
          AdminProductsListApiResponse,
          AdminProductsListParams
        >(
          ADMIN_PRODUCTS_REQUEST_ID,
          "/admin/products",
          createProductListParams({
            page,
            pageSize,
            search,
            status,
            categoryId,
            brand,
            featured,
            inTrash,
            stock,
            discounted,
            sortField,
            sortDirection,
          }),
        );

        if (!mounted || !response) {
          return;
        }

        if (response.items.length === 0 && response.total > 0 && page > 0) {
          setPage(Math.max(0, Math.ceil(response.total / pageSize) - 1));
        }
        setSelectedRows([]);
        setRows(response.items);
        setRowCount(response.total);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setRows([]);
        setRowCount(0);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : dictionary.admin.products.feedback.loadError,
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      mounted = false;
      abort(ADMIN_PRODUCTS_REQUEST_ID);
    };
  }, [
    abort,
    brand,
    cancellableApi,
    categoryId,
    dictionary.admin.products.feedback.loadError,
    featured,
    inTrash,
    page,
    pageSize,
    search,
    sortDirection,
    sortField,
    status,
    stock,
    discounted,
    refreshKey,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadCategoryOptions = async (): Promise<void> => {
      try {
        const response = await cancellableApi.get<
          AdminCategoryParentOptionsApiResponse,
          undefined
        >(
          ADMIN_PRODUCT_CATEGORY_OPTIONS_REQUEST_ID,
          "/admin/categories/parent-options",
        );

        if (mounted && response) {
          setCategoryOptions(response.items);
        }
      } catch {
        if (mounted) {
          setErrorMessage(
            dictionary.admin.products.feedback.loadCategoriesError,
          );
        }
      }
    };

    void loadCategoryOptions();

    return () => {
      mounted = false;
      abort(ADMIN_PRODUCT_CATEGORY_OPTIONS_REQUEST_ID);
    };
  }, [
    abort,
    cancellableApi,
    dictionary.admin.products.feedback.loadCategoriesError,
  ]);

  const openWorkspace = (id: string, section: ProductWorkspaceSection) => {
    router.push(
      productWorkspaceHref(
        id,
        section,
        window.location.pathname + window.location.search,
      ),
    );
  };
  const openProductEditor = (id: string) => openWorkspace(id, "information");
  const submitProduct = async (
    payload: AdminProductUpsertParams,
    productId: string | null,
  ): Promise<void> => {
    setIsSubmitting(true);

    try {
      const response = productId
        ? await cancellableApi.patch<
            AdminProductMutationApiResponse,
            AdminProductUpsertParams
          >(
            `admin-products-update-${productId}`,
            `/admin/products/${productId}`,
            payload,
          )
        : await cancellableApi.post<
            AdminProductMutationApiResponse,
            AdminProductUpsertParams
          >("admin-products-create", "/admin/products", payload);

      if (!response) {
        return;
      }

      refreshProducts();

      setIsFormOpen(false);
      setEditingProduct(null);
      if (!productId) openWorkspace(response.product.id, "information");
    } catch (error) {
      enqueueSnackbar(resolveProductFeedbackMessage(dictionary, error), {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeLifecycle = async (
    product: AdminProductListItemDto,
    action: AdminProductBulkAction,
    requestId = `admin-products-${action}-${product.id}`,
  ): Promise<boolean> => {
    const response = await cancellableApi.post<
      AdminProductMutationApiResponse,
      Record<string, never>
    >(requestId, `/admin/products/${product.id}/${action}`, {});

    if (!response) {
      return false;
    }

    return true;
  };

  const executeBulk = async (): Promise<void> => {
    if (!bulkDialog || selectedRows.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const selectedProducts = rows.filter((row) =>
      selectedRows.includes(row.id),
    );
    let successCount = 0;
    let failedCount = 0;

    for (const product of selectedProducts) {
      try {
        const success = await executeLifecycle(
          product,
          bulkDialog.action,
          `admin-products-bulk-${bulkDialog.action}-${product.id}`,
        );

        if (success) {
          successCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    enqueueSnackbar(
      dictionary.admin.products.bulk.report
        .replace("{success}", String(successCount))
        .replace("{failed}", String(failedCount)),
      { variant: failedCount > 0 ? "warning" : "success" },
    );
    setSelectedRows([]);
    setBulkDialog(null);
    setIsSubmitting(false);
    refreshProducts();
  };

  const clearFilters = (): void => {
    setSearch("");
    setStatus("all");
    setCategoryId("");
    setBrand("");
    setFeatured(FEATURED_FILTER.all);
    setInTrash(false);
    setStock("all");
    setDiscounted("all");
    setPage(0);
    setSortField(ADMIN_PRODUCT_SORT_FIELD.updatedAt);
    setSortDirection(ADMIN_PRODUCT_SORT_DIRECTION.desc);
  };

  const columns: GridColDef<AdminProductListItemDto>[] = [
    {
      field: "name",
      headerName: dictionary.admin.products.table.columns.name,
      flex: 1.2,
      minWidth: 220,
      renderCell: ({ row }: GridRenderCellParams<AdminProductListItemDto>) => (
        <Stack sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.slug}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "status",
      headerName: dictionary.admin.products.table.columns.status,
      minWidth: 130,
      valueGetter: (_value, row) => getStatusLabel(dictionary, row.status),
    },
    {
      field: "brand",
      headerName: dictionary.admin.products.table.columns.brand,
      minWidth: 150,
      valueGetter: (_value, row) => row.brand ?? "",
    },
    {
      field: "categories",
      headerName: dictionary.admin.products.table.columns.categories,
      minWidth: 180,
      sortable: false,
      valueGetter: (_value, row) => getCategoriesLabel(row),
    },
    {
      field: "variantCount",
      sortable: false,
      headerName: dictionary.admin.products.table.columns.variants,
      minWidth: 110,
    },
    {
      field: "sellableVariantCount",
      sortable: false,
      headerName: dictionary.admin.products.table.columns.sellable,
      minWidth: 110,
    },
    {
      field: "warnings",
      headerName: dictionary.admin.products.table.columns.warnings,
      minWidth: 280,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<AdminProductListItemDto>) => (
        <ProductSellabilityWarnings
          dictionary={dictionary}
          warnings={row.warnings}
        />
      ),
      valueGetter: (_value, row) => getWarningsLabel(dictionary, row.warnings),
    },
    {
      field: "trash",
      headerName: dictionary.admin.products.table.columns.trash,
      minWidth: 100,
      sortable: false,
      valueGetter: (_value, row) =>
        row.inTrash
          ? dictionary.admin.products.table.trashYes
          : dictionary.admin.products.table.trashNo,
    },
    {
      field: "createdAt",
      headerName: dictionary.admin.products.table.createdAt,
      minWidth: 180,
      valueFormatter: (value: string) =>
        new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(
          new Date(value),
        ),
    },
    {
      field: "updatedAt",
      headerName: dictionary.admin.products.table.updatedAt,
      minWidth: 180,
      valueFormatter: (value: string) =>
        new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(
          new Date(value),
        ),
    },
    {
      field: "actions",
      headerName: dictionary.admin.products.table.columns.actions,
      minWidth: 390,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<AdminProductListItemDto>) => (
        <Stack direction="row" spacing={1} sx={{ py: 1 }}>
          <Button
            size="small"
            onClick={() => {
              void openProductEditor(row.id);
            }}
          >
            {dictionary.admin.products.actions.edit}
          </Button>
          <Button
            size="small"
            startIcon={row.inTrash ? <RestoreOutlined /> : <DeleteOutline />}
            disabled={isSubmitting}
            onClick={() => {
              setSelectedRows([row.id]);
              setBulkDialog({
                action: row.inTrash
                  ? ADMIN_PRODUCT_BULK_ACTION.restore
                  : ADMIN_PRODUCT_BULK_ACTION.trash,
              });
            }}
          >
            {row.inTrash
              ? dictionary.admin.products.actions.restore
              : dictionary.admin.products.actions.sendToTrash}
          </Button>
          <Button
            size="small"
            startIcon={<ArchiveOutlined />}
            disabled={isSubmitting}
            onClick={() => {
              setSelectedRows([row.id]);
              setBulkDialog({ action: ADMIN_PRODUCT_BULK_ACTION.archive });
            }}
          >
            {dictionary.admin.products.actions.archive}
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
          >
            {dictionary.admin.products.actions.create}
          </Button>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          <TextField
            label={dictionary.admin.products.table.searchLabel}
            placeholder={dictionary.admin.products.table.searchPlaceholder}
            size="small"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ minWidth: { xs: "100%", md: 280 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 170 } }}>
            <InputLabel id="admin-products-status-filter-label">
              {dictionary.admin.products.table.statusFilter}
            </InputLabel>
            <Select
              labelId="admin-products-status-filter-label"
              value={status}
              label={dictionary.admin.products.table.statusFilter}
              onChange={(event) => {
                const nextStatus = event.target.value;

                setStatus(
                  nextStatus === "all" ||
                    ADMIN_PRODUCT_STATUS_VALUES.some(
                      (value) => value === nextStatus,
                    )
                    ? nextStatus
                    : "all",
                );
                setPage(0);
              }}
            >
              <MenuItem value="all">
                {dictionary.admin.products.table.allStatuses}
              </MenuItem>
              {ADMIN_PRODUCT_STATUS_VALUES.map((statusValue) => (
                <MenuItem key={statusValue} value={statusValue}>
                  {getStatusLabel(dictionary, statusValue)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            options={categoryOptions}
            value={
              categoryOptions.find((option) => option.id === categoryId) ?? null
            }
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_event, category) => {
              setCategoryId(category?.id ?? "");
              setPage(0);
            }}
            sx={{ minWidth: { xs: "100%", md: 210 } }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={dictionary.admin.products.table.categoryFilter}
                size="small"
              />
            )}
          />
          <TextField
            label={dictionary.admin.products.table.brandFilter}
            size="small"
            value={brand}
            onChange={(event) => {
              setBrand(event.target.value);
              setPage(0);
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
            <InputLabel id="admin-products-featured-filter-label">
              {dictionary.admin.products.table.featuredFilter}
            </InputLabel>
            <Select
              labelId="admin-products-featured-filter-label"
              value={featured}
              label={dictionary.admin.products.table.featuredFilter}
              onChange={(event) => {
                const nextFeatured = event.target.value;

                if (
                  nextFeatured === FEATURED_FILTER.all ||
                  nextFeatured === FEATURED_FILTER.yes ||
                  nextFeatured === FEATURED_FILTER.no
                ) {
                  setFeatured(nextFeatured);
                }
                setPage(0);
              }}
            >
              <MenuItem value={FEATURED_FILTER.all}>
                {dictionary.admin.products.table.featuredAll}
              </MenuItem>
              <MenuItem value={FEATURED_FILTER.yes}>
                {dictionary.admin.products.table.featuredYes}
              </MenuItem>
              <MenuItem value={FEATURED_FILTER.no}>
                {dictionary.admin.products.table.featuredNo}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 190 } }}>
            <InputLabel id="products-stock-filter">
              {dictionary.admin.products.table.stockFilter}
            </InputLabel>
            <Select
              labelId="products-stock-filter"
              label={dictionary.admin.products.table.stockFilter}
              value={stock}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === "all" ||
                  value === "in_stock" ||
                  value === "out_of_stock"
                )
                  setStock(value);
                setPage(0);
              }}
            >
              <MenuItem value="all">
                {dictionary.admin.products.table.stockAll}
              </MenuItem>
              <MenuItem value="in_stock">
                {dictionary.admin.products.table.stockYes}
              </MenuItem>
              <MenuItem value="out_of_stock">
                {dictionary.admin.products.table.stockNo}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
            <InputLabel id="products-discount-filter">
              {dictionary.admin.products.table.discountFilter}
            </InputLabel>
            <Select
              labelId="products-discount-filter"
              label={dictionary.admin.products.table.discountFilter}
              value={discounted}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "all" || value === "yes" || value === "no")
                  setDiscounted(value);
                setPage(0);
              }}
            >
              <MenuItem value="all">
                {dictionary.admin.products.table.discountAll}
              </MenuItem>
              <MenuItem value="yes">
                {dictionary.admin.products.table.discountYes}
              </MenuItem>
              <MenuItem value="no">
                {dictionary.admin.products.table.discountNo}
              </MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={inTrash}
                onChange={(event) => {
                  setInTrash(event.target.checked);
                  setPage(0);
                }}
              />
            }
            label={dictionary.admin.products.table.onlyTrash}
          />
          <Button variant="outlined" onClick={clearFilters}>
            {dictionary.admin.products.table.clearFilters}
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Button
            variant="outlined"
            disabled={selectedRows.length === 0 || isSubmitting}
            onClick={() =>
              setBulkDialog({ action: ADMIN_PRODUCT_BULK_ACTION.trash })
            }
          >
            {dictionary.admin.products.bulk.trash}
          </Button>
          <Button
            variant="outlined"
            disabled={selectedRows.length === 0 || isSubmitting}
            onClick={() =>
              setBulkDialog({ action: ADMIN_PRODUCT_BULK_ACTION.restore })
            }
          >
            {dictionary.admin.products.bulk.restore}
          </Button>
          <Button
            variant="outlined"
            disabled={selectedRows.length === 0 || isSubmitting}
            onClick={() =>
              setBulkDialog({ action: ADMIN_PRODUCT_BULK_ACTION.archive })
            }
          >
            {dictionary.admin.products.bulk.archive}
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {dictionary.admin.products.table.results}: {rowCount}
        </Typography>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Box
          role="region"
          aria-label={dictionary.admin.products.title}
          sx={{ height: 620, minWidth: 0, width: "100%" }}
        >
          <NoSsr>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={isLoading}
              slotProps={{
                loadingOverlay: {
                  variant: "linear-progress",
                  noRowsVariant: "linear-progress",
                },
              }}
              rowCount={rowCount}
              checkboxSelection
              rowSelectionModel={gridSelectionModel}
              disableRowSelectionOnClick
              pagination
              paginationMode="server"
              sortingMode="server"
              pageSizeOptions={ADMIN_PRODUCT_PAGE_SIZE_OPTIONS}
              paginationModel={gridPaginationModel}
              onPaginationModelChange={(model: GridPaginationModel) => {
                setPage(model.page);
                setPageSize(model.pageSize);
              }}
              sortModel={gridSortModel}
              onSortModelChange={(model: GridSortModel) => {
                const nextSort = model[0];
                const nextField =
                  nextSort && isSupportedSortField(nextSort.field)
                    ? nextSort.field
                    : ADMIN_PRODUCT_SORT_FIELD.updatedAt;

                setSortField(nextField);
                setSortDirection(
                  nextSort?.sort === ADMIN_PRODUCT_SORT_DIRECTION.asc
                    ? ADMIN_PRODUCT_SORT_DIRECTION.asc
                    : ADMIN_PRODUCT_SORT_DIRECTION.desc,
                );
                setPage(0);
              }}
              onRowSelectionModelChange={(model) => {
                setSelectedRows(
                  model.type === "exclude"
                    ? rows
                        .filter((row) => !model.ids.has(row.id))
                        .map((row) => row.id)
                    : Array.from(model.ids).filter(isString),
                );
              }}
              localeText={{
                noRowsLabel: dictionary.admin.products.table.noRows,
                toolbarColumns: dictionary.grid.columns,
                toolbarFilters: dictionary.grid.filters,
                toolbarDensity: dictionary.grid.density,
              }}
              sx={{
                border: 1,
                borderColor: "divider",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                },
              }}
            />
          </NoSsr>
        </Box>
      </Stack>

      {isFormOpen ? (
        <ProductFormDialog
          dictionary={dictionary}
          open
          product={editingProduct}
          categoryOptions={categoryOptions}
          isSubmitting={isSubmitting}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={(payload, productId) =>
            void submitProduct(payload, productId)
          }
        />
      ) : null}

      <Dialog
        open={bulkDialog !== null}
        onClose={() => {
          if (!isSubmitting) setBulkDialog(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{dictionary.admin.products.bulkConfirm.title}</DialogTitle>
        <DialogContent>
          <Typography>
            {dictionary.admin.products.bulkConfirm.description.replace(
              "{count}",
              String(selectedRows.length),
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={isSubmitting} onClick={() => setBulkDialog(null)}>
            {dictionary.admin.products.bulkConfirm.cancel}
          </Button>
          <Button
            disabled={isSubmitting}
            variant="contained"
            onClick={() => void executeBulk()}
          >
            {dictionary.admin.products.bulkConfirm.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
