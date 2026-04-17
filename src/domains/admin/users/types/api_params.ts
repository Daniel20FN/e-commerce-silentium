import type {
  AdminUserRole,
  AdminUserSortDirection,
  AdminUserSortField,
  AdminUserStatus,
} from "./shared";

export interface AdminUsersListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  sortField?: AdminUserSortField;
  sortDirection?: AdminUserSortDirection;
}

export interface AdminUserUpdateParams {
  role?: AdminUserRole;
  status?: AdminUserStatus;
}
