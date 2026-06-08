"use client";

import { FilesUploader } from "@/components/files-uploader/files_uploader";
import type { DocumentType } from "@/components/files-uploader/types";
import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type {
  AdminCategoriesListParams,
  AdminCategoryUpsertParams,
} from "@/domains/admin/categories/types/api_params";
import type {
  AdminCategoriesListApiResponse,
  AdminCategoryBulkActionApiResponse,
  AdminCategoryListItemDto,
  AdminCategoryMutationApiResponse,
  AdminCategoryParentOptionDto,
  AdminCategoryParentOptionsApiResponse,
} from "@/domains/admin/categories/types/api_responses";
import {
  ADMIN_CATEGORY_HIERARCHY,
  ADMIN_CATEGORY_HIERARCHY_VALUES,
  ADMIN_CATEGORY_PAGE_SIZE_OPTIONS,
  ADMIN_CATEGORY_STATUS,
  ADMIN_CATEGORY_STATUS_VALUES,
} from "@/domains/admin/categories/types/shared";
import { uploadAdminStorageImage } from "@/domains/admin/storage/services/upload_admin_storage_image";
import { ADMIN_STORAGE_IMAGE_SCOPE } from "@/domains/admin/storage/types/shared";
import {
  DeleteOutline,
  RestoreOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

const ADMIN_CATEGORIES_REQUEST_ID = "admin-categories-list";
const ADMIN_CATEGORIES_PARENT_OPTIONS_REQUEST_ID =
  "admin-categories-parent-options";

interface FileDeletionCandidate {
  dbUrl: string;
}

interface AdminCategoriesPageProps {
  dictionary: Dictionary;
}

interface CategoryFormState {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
}

function getStatusLabel(dictionary: Dictionary, isActive: boolean): string {
  return isActive
    ? dictionary.admin.categories.status.active
    : dictionary.admin.categories.status.inactive;
}

function getHierarchyLabel(
  dictionary: Dictionary,
  category: AdminCategoryListItemDto,
): string {
  return category.parentName ?? dictionary.admin.categories.hierarchy.root;
}

function toNullableTrimmedValue(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function createCategorySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

function createCategoryImageDocument(
  category: AdminCategoryListItemDto,
): DocumentType[] {
  if (!category.imageUrl) {
    return [];
  }

  return [
    {
      dbUrl: category.imageUrl,
      fileName: `${category.slug}-image`,
      id: `${category.id}-image`,
      size: 0,
      type: "image/*",
      url: category.imageUrl,
    },
  ];
}

function toCategoryUpsertPayload(
  formState: CategoryFormState,
  imageUrl: string | null = toNullableTrimmedValue(formState.imageUrl),
): AdminCategoryUpsertParams {
  return {
    name: formState.name.trim(),
    slug: formState.slug.trim(),
    description: toNullableTrimmedValue(formState.description),
    imageUrl,
    parentId: formState.parentId,
    sortOrder: formState.sortOrder,
    isActive: formState.isActive,
    seoTitle: toNullableTrimmedValue(formState.seoTitle),
    seoDescription: toNullableTrimmedValue(formState.seoDescription),
  };
}

export function AdminCategoriesPage({ dictionary }: AdminCategoriesPageProps) {
  const { cancellableApi, abort } = useCancellableApiContext();
  const [rows, setRows] = useState<AdminCategoryListItemDto[]>([]);
  const [parentCandidateRows, setParentCandidateRows] = useState<
    AdminCategoryParentOptionDto[]
  >([]);
  const [rowCount, setRowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(
    ADMIN_CATEGORY_PAGE_SIZE_OPTIONS[0],
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    (typeof ADMIN_CATEGORY_STATUS)[keyof typeof ADMIN_CATEGORY_STATUS]
  >(ADMIN_CATEGORY_STATUS.all);
  const [hierarchy, setHierarchy] = useState<
    (typeof ADMIN_CATEGORY_HIERARCHY)[keyof typeof ADMIN_CATEGORY_HIERARCHY]
  >(ADMIN_CATEGORY_HIERARCHY.all);
  const [inTrash, setInTrash] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingTrashCategory, setPendingTrashCategory] =
    useState<AdminCategoryListItemDto | null>(null);
  const [categoryImageFiles, setCategoryImageFiles] = useState<DocumentType[]>(
    [],
  );
  const [, setFilesToDelete] = useState<FileDeletionCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<CategoryFormState>({
    id: null,
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    parentId: null,
    parentName: null,
    sortOrder: 0,
    isActive: true,
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadCategories = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await cancellableApi.get<
          AdminCategoriesListApiResponse,
          AdminCategoriesListParams
        >(ADMIN_CATEGORIES_REQUEST_ID, "/admin/categories", {
          page,
          pageSize,
          search,
          status,
          hierarchy,
          inTrash,
        });

        if (!mounted || !response) {
          return;
        }

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
            : dictionary.admin.categories.feedback.loadError,
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      mounted = false;
      abort(ADMIN_CATEGORIES_REQUEST_ID);
    };
  }, [
    abort,
    cancellableApi,
    dictionary.admin.categories.feedback.loadError,
    hierarchy,
    inTrash,
    page,
    pageSize,
    search,
    status,
  ]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    let mounted = true;

    const loadParentOptions = async (): Promise<void> => {
      try {
        const response = await cancellableApi.get<
          AdminCategoryParentOptionsApiResponse,
          undefined
        >(
          ADMIN_CATEGORIES_PARENT_OPTIONS_REQUEST_ID,
          "/admin/categories/parent-options",
        );

        if (mounted && response) {
          setParentCandidateRows(response.items);
        }
      } catch {
        if (mounted) {
          setParentCandidateRows([]);
        }
      }
    };

    void loadParentOptions();

    return () => {
      mounted = false;
      abort(ADMIN_CATEGORIES_PARENT_OPTIONS_REQUEST_ID);
    };
  }, [abort, cancellableApi, isFormOpen]);

  const executeBulk = async (
    action: "activate" | "deactivate" | "trash" | "restore",
  ): Promise<void> => {
    if (selectedRows.length === 0) {
      return;
    }

    const response = await cancellableApi.post<
      AdminCategoryBulkActionApiResponse,
      {
        action: "activate" | "deactivate" | "trash" | "restore";
        categoryIds: string[];
      }
    >("admin-categories-bulk", "/admin/categories/bulk", {
      action,
      categoryIds: selectedRows,
    });

    if (!response) {
      return;
    }

    enqueueSnackbar(
      dictionary.admin.categories.bulk.report
        .replace("{success}", String(response.successCount))
        .replace("{failed}", String(response.exceptions.length)),
      {
        variant: response.exceptions.length > 0 ? "warning" : "success",
      },
    );

    setSelectedRows([]);
    setPage(0);
  };

  const handleTrashOrRestore = async (
    category: AdminCategoryListItemDto,
  ): Promise<void> => {
    if (!category.inTrash) {
      setPendingTrashCategory(category);
      return;
    }

    const endpoint = category.inTrash
      ? `/admin/categories/${category.id}/restore`
      : `/admin/categories/${category.id}/trash`;

    const response = await cancellableApi.post<
      AdminCategoryMutationApiResponse,
      Record<string, never>
    >(`admin-category-${category.id}-toggle-trash`, endpoint, {});

    if (!response) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === category.id ? response.category : row,
      ),
    );
  };

  const openCreateForm = (): void => {
    setCategoryImageFiles([]);
    setFilesToDelete([]);
    setFormState({
      id: null,
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      parentId: null,
      parentName: null,
      sortOrder: 0,
      isActive: true,
      seoTitle: "",
      seoDescription: "",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (category: AdminCategoryListItemDto): void => {
    setCategoryImageFiles(createCategoryImageDocument(category));
    setFilesToDelete([]);
    setFormState({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      parentId: category.parentId,
      parentName: category.parentName,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      seoTitle: category.seoTitle ?? "",
      seoDescription: category.seoDescription ?? "",
    });
    setIsFormOpen(true);
  };

  const submitForm = async (): Promise<void> => {
    if (!formState.name.trim() || !formState.slug.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedImageFile = categoryImageFiles.find(
        (file) => file.originalFile,
      )?.originalFile;
      let imageUrl = toNullableTrimmedValue(formState.imageUrl);

      if (selectedImageFile) {
        const uploadedImage = await uploadAdminStorageImage({
          entityId: formState.id ?? formState.slug,
          file: selectedImageFile,
          scope: ADMIN_STORAGE_IMAGE_SCOPE.category,
        });
        imageUrl = uploadedImage.publicUrl;
      }

      const payload = toCategoryUpsertPayload(formState, imageUrl);

      if (!formState.id) {
        const created = await cancellableApi.post<
          AdminCategoryMutationApiResponse,
          AdminCategoryUpsertParams
        >("admin-categories-create", "/admin/categories", payload);

        if (created) {
          setRows((currentRows) => [created.category, ...currentRows]);
        }
        setIsFormOpen(false);
        return;
      }

      const updated = await cancellableApi.patch<
        AdminCategoryMutationApiResponse,
        AdminCategoryUpsertParams
      >(
        `admin-categories-edit-${formState.id}`,
        `/admin/categories/${formState.id}`,
        payload,
      );

      if (updated) {
        setRows((currentRows) =>
          currentRows.map((row) =>
            row.id === formState.id ? updated.category : row,
          ),
        );
      }

      setIsFormOpen(false);
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error
          ? error.message
          : dictionary.admin.categories.feedback.imageUploadError,
        {
          variant: "error",
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: GridColDef<AdminCategoryListItemDto>[] = [
    {
      field: "name",
      headerName: dictionary.admin.categories.table.columns.name,
      flex: 1.3,
      minWidth: 220,
    },
    {
      field: "slug",
      headerName: dictionary.admin.categories.table.columns.slug,
      flex: 1,
      minWidth: 180,
    },
    {
      field: "hierarchy",
      headerName: dictionary.admin.categories.table.columns.hierarchy,
      minWidth: 150,
      valueGetter: (_value, row) => getHierarchyLabel(dictionary, row),
    },
    {
      field: "status",
      headerName: dictionary.admin.categories.table.columns.status,
      minWidth: 120,
      valueGetter: (_value, row) => getStatusLabel(dictionary, row.isActive),
    },
    {
      field: "sortOrder",
      headerName: dictionary.admin.categories.table.columns.sortOrder,
      minWidth: 100,
    },
    {
      field: "trash",
      headerName: dictionary.admin.categories.table.columns.trash,
      minWidth: 110,
      valueGetter: (_value, row) =>
        row.inTrash
          ? dictionary.admin.categories.table.trashYes
          : dictionary.admin.categories.table.trashNo,
    },
    {
      field: "actions",
      headerName: dictionary.admin.categories.table.columns.actions,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => openEditForm(row)}>
            {dictionary.admin.categories.actions.edit}
          </Button>
          <Button
            size="small"
            startIcon={row.inTrash ? <RestoreOutlined /> : <DeleteOutline />}
            onClick={() => void handleTrashOrRestore(row)}
          >
            {row.inTrash
              ? dictionary.admin.categories.actions.restore
              : dictionary.admin.categories.actions.sendToTrash}
          </Button>
        </Stack>
      ),
    },
  ];

  const parentOptionsById = new Map<string, AdminCategoryParentOptionDto>();

  for (const option of parentCandidateRows) {
    if (option.id !== formState.id) {
      parentOptionsById.set(option.id, option);
    }
  }

  if (
    formState.parentId !== null &&
    formState.parentId !== formState.id &&
    !parentOptionsById.has(formState.parentId)
  ) {
    parentOptionsById.set(formState.parentId, {
      id: formState.parentId,
      name: formState.parentName ?? formState.parentId,
    });
  }

  const parentOptions = Array.from(parentOptionsById.values());

  const confirmSendToTrash = async (): Promise<void> => {
    if (!pendingTrashCategory) {
      return;
    }

    const response = await cancellableApi.post<
      AdminCategoryMutationApiResponse,
      Record<string, never>
    >(
      `admin-category-${pendingTrashCategory.id}-toggle-trash`,
      `/admin/categories/${pendingTrashCategory.id}/trash`,
      {},
    );

    if (response) {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === pendingTrashCategory.id ? response.category : row,
        ),
      );
    }

    setPendingTrashCategory(null);
  };

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          border: 1,
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={openCreateForm}>
              {dictionary.admin.categories.actions.create}
            </Button>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label={dictionary.admin.categories.table.searchLabel}
              placeholder={dictionary.admin.categories.table.searchPlaceholder}
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: "100%", md: 320 } }}
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

            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", md: 160 } }}
            >
              <InputLabel id="admin-categories-status-label">
                {dictionary.admin.categories.table.statusFilter}
              </InputLabel>
              <Select
                labelId="admin-categories-status-label"
                value={status}
                label={dictionary.admin.categories.table.statusFilter}
                onChange={(event) => {
                  setStatus(event.target.value as typeof status);
                  setPage(0);
                }}
              >
                {ADMIN_CATEGORY_STATUS_VALUES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value === ADMIN_CATEGORY_STATUS.all
                      ? dictionary.admin.categories.table.allStatuses
                      : getStatusLabel(
                          dictionary,
                          value === ADMIN_CATEGORY_STATUS.active,
                        )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", md: 160 } }}
            >
              <InputLabel id="admin-categories-hierarchy-label">
                {dictionary.admin.categories.table.hierarchyFilter}
              </InputLabel>
              <Select
                labelId="admin-categories-hierarchy-label"
                value={hierarchy}
                label={dictionary.admin.categories.table.hierarchyFilter}
                onChange={(event) => {
                  setHierarchy(event.target.value as typeof hierarchy);
                  setPage(0);
                }}
              >
                {ADMIN_CATEGORY_HIERARCHY_VALUES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value === ADMIN_CATEGORY_HIERARCHY.all
                      ? dictionary.admin.categories.table.allHierarchy
                      : value === ADMIN_CATEGORY_HIERARCHY.root
                        ? dictionary.admin.categories.hierarchy.root
                        : dictionary.admin.categories.hierarchy.child}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={inTrash}
                onChange={(event) => {
                  setInTrash(event.target.checked);
                  setPage(0);
                }}
              />
              <Typography>
                {dictionary.admin.categories.table.onlyTrash}
              </Typography>
            </Stack>

            <Button
              variant="outlined"
              onClick={() => {
                setSearch("");
                setStatus(ADMIN_CATEGORY_STATUS.all);
                setHierarchy(ADMIN_CATEGORY_HIERARCHY.all);
                setInTrash(false);
                setPage(0);
              }}
            >
              {dictionary.admin.categories.table.clearFilters}
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Button
              variant="contained"
              disabled={selectedRows.length === 0}
              onClick={() => void executeBulk("activate")}
            >
              {dictionary.admin.categories.bulk.activate}
            </Button>
            <Button
              variant="outlined"
              disabled={selectedRows.length === 0}
              onClick={() => void executeBulk("deactivate")}
            >
              {dictionary.admin.categories.bulk.deactivate}
            </Button>
            <Button
              variant="outlined"
              disabled={selectedRows.length === 0}
              onClick={() => void executeBulk("trash")}
            >
              {dictionary.admin.categories.bulk.trash}
            </Button>
            <Button
              variant="outlined"
              disabled={selectedRows.length === 0}
              onClick={() => void executeBulk("restore")}
            >
              {dictionary.admin.categories.bulk.restore}
            </Button>
          </Stack>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <Box sx={{ minHeight: 560 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={isLoading}
              rowCount={rowCount}
              checkboxSelection
              disableRowSelectionOnClick
              pagination
              paginationMode="server"
              pageSizeOptions={
                ADMIN_CATEGORY_PAGE_SIZE_OPTIONS as unknown as number[]
              }
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model: GridPaginationModel) => {
                setPage(model.page);
                setPageSize(model.pageSize);
              }}
              onRowSelectionModelChange={(model) => {
                setSelectedRows(Array.from(model.ids) as string[]);
              }}
              localeText={{
                noRowsLabel: dictionary.admin.categories.table.noRows,
                toolbarColumns: dictionary.grid.columns,
                toolbarFilters: dictionary.grid.filters,
                toolbarDensity: dictionary.grid.density,
              }}
            />
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {formState.id
            ? dictionary.admin.categories.form.editTitle
            : dictionary.admin.categories.form.createTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              helperText={dictionary.admin.categories.formHelp.name}
              label={dictionary.admin.categories.form.name}
              value={formState.name}
              onChange={(event) =>
                setFormState((currentValue) => ({
                  ...currentValue,
                  name: event.target.value,
                  slug: createCategorySlug(event.target.value),
                }))
              }
              size="small"
            />
            <TextField
              disabled
              helperText={dictionary.admin.categories.formHelp.slug}
              label={dictionary.admin.categories.form.slug}
              value={formState.slug}
              size="small"
            />
            <TextField
              helperText={dictionary.admin.categories.formHelp.description}
              label={dictionary.admin.categories.form.description}
              value={formState.description}
              onChange={(event) =>
                setFormState((currentValue) => ({
                  ...currentValue,
                  description: event.target.value,
                }))
              }
              size="small"
              multiline
              minRows={3}
            />
            <FormControl size="small">
              <InputLabel id="admin-categories-parent-label">
                {dictionary.admin.categories.form.parent}
              </InputLabel>
              <Select
                labelId="admin-categories-parent-label"
                value={formState.parentId ?? ""}
                label={dictionary.admin.categories.form.parent}
                onChange={(event) =>
                  setFormState((currentValue) => ({
                    ...currentValue,
                    parentId:
                      typeof event.target.value === "string" &&
                      event.target.value.length > 0
                        ? event.target.value
                        : null,
                    parentName:
                      typeof event.target.value === "string" &&
                      event.target.value.length > 0
                        ? (parentOptionsById.get(event.target.value)?.name ??
                          null)
                        : null,
                  }))
                }
              >
                <MenuItem value="">
                  {dictionary.admin.categories.form.noParent}
                </MenuItem>
                {parentOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {dictionary.admin.categories.formHelp.parent}
              </FormHelperText>
            </FormControl>
            <TextField
              helperText={dictionary.admin.categories.formHelp.sortOrder}
              label={dictionary.admin.categories.form.sortOrder}
              value={String(formState.sortOrder)}
              onChange={(event) =>
                setFormState((currentValue) => ({
                  ...currentValue,
                  sortOrder: Number(event.target.value) || 0,
                }))
              }
              size="small"
            />
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFormState((currentValue) => ({
                        ...currentValue,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                }
                label={dictionary.admin.categories.form.status}
              />
              <Typography color="text.secondary" variant="caption">
                {dictionary.admin.categories.formHelp.status}
              </Typography>
            </Stack>
            <TextField
              helperText={dictionary.admin.categories.formHelp.seoTitle}
              label={dictionary.admin.categories.form.seoTitle}
              value={formState.seoTitle}
              onChange={(event) =>
                setFormState((currentValue) => ({
                  ...currentValue,
                  seoTitle: event.target.value,
                }))
              }
              size="small"
            />
            <TextField
              helperText={dictionary.admin.categories.formHelp.seoDescription}
              label={dictionary.admin.categories.form.seoDescription}
              value={formState.seoDescription}
              onChange={(event) =>
                setFormState((currentValue) => ({
                  ...currentValue,
                  seoDescription: event.target.value,
                }))
              }
              size="small"
            />
            <Stack spacing={1}>
              <Typography fontWeight={600} variant="subtitle2">
                {dictionary.admin.categories.form.image}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {dictionary.admin.categories.formHelp.image}
              </Typography>
              <FilesUploader
                initialFiles={categoryImageFiles}
                maxFiles={1}
                multiple={false}
                onFilesChange={(files) => {
                  const nextFiles = files.slice(0, 1);
                  const nextFile = nextFiles[0];

                  setCategoryImageFiles(nextFiles);
                  setFormState((currentValue) => ({
                    ...currentValue,
                    imageUrl:
                      nextFile?.dbUrl ??
                      (!nextFile || nextFile.originalFile ? "" : nextFile.url),
                  }));
                }}
                permitedFileTypes={{
                  documents: false,
                  images: true,
                  texts: false,
                  videos: false,
                }}
                setFilesToDelete={setFilesToDelete}
                trads={dictionary.admin.categories.form.imageUploader}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFormOpen(false)}>
            {dictionary.admin.categories.form.cancel}
          </Button>
          <Button
            disabled={isSubmitting}
            variant="contained"
            onClick={() => void submitForm()}
          >
            {dictionary.admin.categories.form.save}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingTrashCategory !== null}
        onClose={() => setPendingTrashCategory(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dictionary.admin.categories.trashConfirm.title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>
              {dictionary.admin.categories.trashConfirm.description}
            </Typography>
            {pendingTrashCategory !== null &&
            (pendingTrashCategory.productsCount ?? 0) > 0 ? (
              <Alert severity="warning">
                {dictionary.admin.categories.trashConfirm.withProductsWarning}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTrashCategory(null)}>
            {dictionary.admin.categories.trashConfirm.cancel}
          </Button>
          <Button variant="contained" onClick={() => void confirmSendToTrash()}>
            {dictionary.admin.categories.trashConfirm.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
