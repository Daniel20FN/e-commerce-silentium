"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  formatAdminDateTime,
  getAdminRoleLabel,
  getAdminStatusLabel,
} from "@/domains/admin/users/services/admin_user_formatters";
import type { AdminUserUpdateParams } from "@/domains/admin/users/types/api_params";
import type {
  AdminUserListItemDto,
  AdminUserMutationApiResponse,
  AdminUsersListApiResponse,
} from "@/domains/admin/users/types/api_responses";
import {
  ADMIN_USER_PAGE_SIZE_OPTIONS,
  ADMIN_USER_ROLE_VALUES,
  ADMIN_USER_SORT_DIRECTION,
  ADMIN_USER_SORT_FIELD,
  ADMIN_USER_STATUS,
  ADMIN_USER_STATUS_VALUES,
  type AdminUserRole,
  type AdminUserSortDirection,
  type AdminUserSortField,
  type AdminUserStatus,
} from "@/domains/admin/users/types/shared";
import {
  BlockOutlined,
  EditOutlined,
  SearchOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  type GridRenderCellParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

const ADMIN_USERS_REQUEST_ID = "admin-users-list";
const ADMIN_USERS_UPDATE_REQUEST_ID = "admin-users-update";

interface AdminUsersPageProps {
  dictionary: Dictionary;
}

interface RoleDialogState {
  userId: string;
  value: AdminUserRole;
}

function getStatusChipColor(
  status: AdminUserStatus,
): "default" | "success" | "warning" | "error" {
  switch (status) {
    case ADMIN_USER_STATUS.active:
      return "success";
    case ADMIN_USER_STATUS.inactive:
      return "default";
    case ADMIN_USER_STATUS.blocked:
      return "error";
    case ADMIN_USER_STATUS.pendingProfile:
      return "warning";
  }
}

export function AdminUsersPage({ dictionary }: AdminUsersPageProps) {
  const { cancellableApi, abort, isPending } = useCancellableApiContext();
  const [rows, setRows] = useState<AdminUserListItemDto[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [isListLoading, setIsListLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(
    ADMIN_USER_PAGE_SIZE_OPTIONS[0],
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | "">("");
  const [sortField, setSortField] = useState<AdminUserSortField>(
    ADMIN_USER_SORT_FIELD.createdAt,
  );
  const [sortDirection, setSortDirection] = useState<AdminUserSortDirection>(
    ADMIN_USER_SORT_DIRECTION.desc,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleDialog, setRoleDialog] = useState<RoleDialogState | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async (): Promise<void> => {
      try {
        setIsListLoading(true);
        setErrorMessage(null);

        const response = await cancellableApi.get<
          AdminUsersListApiResponse,
          {
            page: number;
            pageSize: number;
            search: string;
            role?: AdminUserRole;
            status?: AdminUserStatus;
            sortField: AdminUserSortField;
            sortDirection: AdminUserSortDirection;
          }
        >(ADMIN_USERS_REQUEST_ID, "/admin/users", {
          page,
          pageSize,
          search: debouncedSearch,
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          sortField,
          sortDirection,
        });

        if (!isMounted || !response) {
          return;
        }

        setRows(response.users);
        setRowCount(response.total);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRows([]);
        setRowCount(0);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : dictionary.admin.users.feedback.updateError,
        );
      } finally {
        if (isMounted) {
          setIsListLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
      abort(ADMIN_USERS_REQUEST_ID);
    };
  }, [
    abort,
    cancellableApi,
    debouncedSearch,
    dictionary.admin.users.feedback.updateError,
    page,
    pageSize,
    roleFilter,
    sortDirection,
    sortField,
    statusFilter,
    reloadVersion,
  ]);

  const handleUpdateUser = async (
    userId: string,
    payload: AdminUserUpdateParams,
    successMessage: string,
  ): Promise<void> => {
    try {
      const response = await cancellableApi.patch<
        AdminUserMutationApiResponse,
        AdminUserUpdateParams
      >(
        `${ADMIN_USERS_UPDATE_REQUEST_ID}-${userId}`,
        `/admin/users/${userId}`,
        payload,
        successMessage,
      );

      if (!response) {
        return;
      }

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === userId ? response.user : row)),
      );
    } catch {
      enqueueSnackbar(dictionary.admin.users.feedback.updateError, {
        variant: "error",
        preventDuplicate: true,
      });
    }
  };

  const columns: GridColDef<AdminUserListItemDto>[] = [
    {
      field: "fullName",
      headerName: dictionary.admin.users.table.columns.fullName,
      flex: 1.3,
      minWidth: 220,
      sortable: true,
      renderCell: ({ row }: GridRenderCellParams<AdminUserListItemDto>) => (
        <Stack sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.fullName || row.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.id}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "email",
      headerName: dictionary.admin.users.table.columns.email,
      flex: 1.2,
      minWidth: 220,
      sortable: true,
    },
    {
      field: "role",
      headerName: dictionary.admin.users.table.columns.role,
      minWidth: 160,
      sortable: true,
      renderCell: ({ row }: GridRenderCellParams<AdminUserListItemDto>) => (
        <Chip
          size="small"
          label={getAdminRoleLabel(dictionary, row.role)}
          variant="outlined"
        />
      ),
    },
    {
      field: "status",
      headerName: dictionary.admin.users.table.columns.status,
      minWidth: 160,
      sortable: true,
      renderCell: ({ row }: GridRenderCellParams<AdminUserListItemDto>) => (
        <Chip
          size="small"
          color={getStatusChipColor(row.status)}
          label={getAdminStatusLabel(dictionary, row.status)}
        />
      ),
    },
    {
      field: "phone",
      headerName: dictionary.admin.users.table.columns.phone,
      minWidth: 160,
      sortable: true,
      valueGetter: (_value, row) => row.phone ?? "—",
    },
    {
      field: "createdAt",
      headerName: dictionary.admin.users.table.columns.createdAt,
      minWidth: 180,
      sortable: true,
      valueGetter: (_value, row) => formatAdminDateTime(row.createdAt),
    },
    {
      field: "lastAccessAt",
      headerName: dictionary.admin.users.table.columns.lastAccessAt,
      minWidth: 180,
      sortable: true,
      valueGetter: (_value, row) => formatAdminDateTime(row.lastAccessAt),
    },
    {
      field: "actions",
      headerName: dictionary.admin.users.table.columns.actions,
      minWidth: 320,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<AdminUserListItemDto>) => {
        const isUpdating = isPending(
          `${ADMIN_USERS_UPDATE_REQUEST_ID}-${row.id}`,
        );

        return (
          <Stack direction="row" spacing={1.5} sx={{ py: 1 }}>
            <Button
              component={Link}
              href={`/admin/usuarios/${row.id}`}
              size="small"
              variant="text"
              startIcon={<VisibilityOutlined />}
              sx={{ textTransform: "capitalize" }}
            >
              {dictionary.admin.users.actions.viewDetail}
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<EditOutlined />}
              disabled={isUpdating}
              sx={{ textTransform: "capitalize" }}
              onClick={() =>
                setRoleDialog({
                  userId: row.id,
                  value: row.role,
                })
              }
            >
              {dictionary.admin.users.actions.editRole}
            </Button>
            <Button
              size="small"
              variant="text"
              color={
                row.status === ADMIN_USER_STATUS.blocked ? "success" : "error"
              }
              startIcon={<BlockOutlined />}
              disabled={isUpdating}
              sx={{ textTransform: "capitalize" }}
              onClick={() =>
                void handleUpdateUser(
                  row.id,
                  {
                    status:
                      row.status === ADMIN_USER_STATUS.blocked
                        ? ADMIN_USER_STATUS.active
                        : ADMIN_USER_STATUS.blocked,
                  },
                  dictionary.admin.users.feedback.statusUpdated,
                )
              }
            >
              {row.status === ADMIN_USER_STATUS.blocked
                ? dictionary.admin.users.actions.activate
                : dictionary.admin.users.actions.block}
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography
          variant="overline"
          color="info.main"
          sx={{ fontWeight: 700 }}
        >
          {dictionary.admin.users.eyebrow}
        </Typography>
        <Typography variant="h4">{dictionary.admin.users.title}</Typography>
        <Typography color="text.secondary">
          {dictionary.admin.users.description}
        </Typography>
      </Stack>

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          border: 1,
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label={dictionary.admin.users.table.searchLabel}
              placeholder={dictionary.admin.users.table.searchPlaceholder}
              size="small"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
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
              sx={{ minWidth: { xs: "100%", md: 180 } }}
            >
              <InputLabel id="admin-users-role-filter-label">
                {dictionary.admin.users.table.roleFilter}
              </InputLabel>
              <Select
                labelId="admin-users-role-filter-label"
                value={roleFilter}
                label={dictionary.admin.users.table.roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as AdminUserRole | "");
                  setPage(0);
                }}
              >
                <MenuItem value="">
                  {dictionary.admin.users.table.allRoles}
                </MenuItem>
                {ADMIN_USER_ROLE_VALUES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {getAdminRoleLabel(dictionary, role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", md: 180 } }}
            >
              <InputLabel id="admin-users-status-filter-label">
                {dictionary.admin.users.table.statusFilter}
              </InputLabel>
              <Select
                labelId="admin-users-status-filter-label"
                value={statusFilter}
                label={dictionary.admin.users.table.statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as AdminUserStatus | "");
                  setPage(0);
                }}
              >
                <MenuItem value="">
                  {dictionary.admin.users.table.allStatuses}
                </MenuItem>
                {ADMIN_USER_STATUS_VALUES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {getAdminStatusLabel(dictionary, status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
                setRoleFilter("");
                setStatusFilter("");
                setPage(0);
                setSortField(ADMIN_USER_SORT_FIELD.createdAt);
                setSortDirection(ADMIN_USER_SORT_DIRECTION.desc);
              }}
            >
              {dictionary.admin.users.filters.clear}
            </Button>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary">
              {dictionary.admin.users.table.results}: {rowCount}
            </Typography>
            {!isListLoading &&
              (debouncedSearch || roleFilter || statusFilter) && (
                <Typography variant="caption" color="text.secondary">
                  {dictionary.admin.users.table.rowsSelected}
                </Typography>
              )}
          </Stack>

          {errorMessage ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setReloadVersion((value) => value + 1)}
                >
                  {dictionary.admin.users.table.retry}
                </Button>
              }
            >
              <strong>{dictionary.admin.users.table.errorTitle}</strong>{" "}
              {errorMessage}
            </Alert>
          ) : null}

          <Box sx={{ minHeight: 620 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              rowCount={rowCount}
              loading={isListLoading}
              disableRowSelectionOnClick
              pagination
              paginationMode="server"
              sortingMode="server"
              slotProps={{
                loadingOverlay: {
                  variant: "linear-progress",
                  noRowsVariant: "skeleton",
                },
              }}
              pageSizeOptions={
                ADMIN_USER_PAGE_SIZE_OPTIONS as unknown as number[]
              }
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model: GridPaginationModel) => {
                setPage(model.page);
                setPageSize(model.pageSize as number);
              }}
              sortModel={[
                {
                  field: sortField,
                  sort: sortDirection,
                },
              ]}
              onSortModelChange={(model: GridSortModel) => {
                const nextSort = model[0];

                setSortField(
                  (nextSort?.field as AdminUserSortField | undefined) ??
                    ADMIN_USER_SORT_FIELD.createdAt,
                );
                setSortDirection(
                  (nextSort?.sort as AdminUserSortDirection | undefined) ??
                    ADMIN_USER_SORT_DIRECTION.desc,
                );
              }}
              initialState={{
                pagination: {
                  paginationModel: {
                    page,
                    pageSize,
                  },
                },
              }}
              localeText={{
                noRowsLabel: dictionary.admin.users.table.emptyTitle,
                noResultsOverlayLabel: dictionary.admin.users.table.emptyTitle,
                toolbarColumns: dictionary.grid.columns,
                toolbarFilters: dictionary.grid.filters,
                toolbarDensity: dictionary.grid.density,
                footerRowSelected: () => "",
              }}
              sx={{
                border: 1,
                borderColor: "divider",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                },
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                },
              }}
            />
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={roleDialog !== null}
        onClose={() => setRoleDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {dictionary.admin.users.dialogs.editRoleTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {dictionary.admin.users.dialogs.editRoleDescription}
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="admin-users-edit-role-label">
                {dictionary.admin.users.dialogs.roleLabel}
              </InputLabel>
              <Select
                labelId="admin-users-edit-role-label"
                value={roleDialog?.value ?? ""}
                label={dictionary.admin.users.dialogs.roleLabel}
                onChange={(event) =>
                  setRoleDialog((currentValue) =>
                    currentValue
                      ? {
                          ...currentValue,
                          value: event.target.value as AdminUserRole,
                        }
                      : null,
                  )
                }
              >
                {ADMIN_USER_ROLE_VALUES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {getAdminRoleLabel(dictionary, role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(null)}>
            {dictionary.admin.users.actions.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!roleDialog) {
                return;
              }

              void handleUpdateUser(
                roleDialog.userId,
                {
                  role: roleDialog.value,
                },
                dictionary.admin.users.feedback.roleUpdated,
              );
              setRoleDialog(null);
            }}
          >
            {dictionary.admin.users.actions.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
