export const ADMIN_USER_ROLE = {
  superAdmin: "super_admin",
  admin: "admin",
  support: "support",
  customer: "customer",
} as const;

export type AdminUserRole =
  (typeof ADMIN_USER_ROLE)[keyof typeof ADMIN_USER_ROLE];

export const ADMIN_USER_STATUS = {
  active: "active",
  inactive: "inactive",
  blocked: "blocked",
  pendingProfile: "pending_profile",
} as const;

export type AdminUserStatus =
  (typeof ADMIN_USER_STATUS)[keyof typeof ADMIN_USER_STATUS];

export const ADMIN_USER_SORT_FIELD = {
  fullName: "fullName",
  email: "email",
  role: "role",
  status: "status",
  phone: "phone",
  createdAt: "createdAt",
  lastAccessAt: "lastAccessAt",
} as const;

export type AdminUserSortField =
  (typeof ADMIN_USER_SORT_FIELD)[keyof typeof ADMIN_USER_SORT_FIELD];

export const ADMIN_USER_SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

export type AdminUserSortDirection =
  (typeof ADMIN_USER_SORT_DIRECTION)[keyof typeof ADMIN_USER_SORT_DIRECTION];

export const ADMIN_USER_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const ADMIN_USER_ROLE_VALUES = [
  ADMIN_USER_ROLE.superAdmin,
  ADMIN_USER_ROLE.admin,
  ADMIN_USER_ROLE.support,
  ADMIN_USER_ROLE.customer,
] as const;

export const ADMIN_USER_STATUS_VALUES = [
  ADMIN_USER_STATUS.active,
  ADMIN_USER_STATUS.inactive,
  ADMIN_USER_STATUS.blocked,
  ADMIN_USER_STATUS.pendingProfile,
] as const;

export const ADMIN_USER_SORT_FIELD_VALUES = [
  ADMIN_USER_SORT_FIELD.fullName,
  ADMIN_USER_SORT_FIELD.email,
  ADMIN_USER_SORT_FIELD.role,
  ADMIN_USER_SORT_FIELD.status,
  ADMIN_USER_SORT_FIELD.phone,
  ADMIN_USER_SORT_FIELD.createdAt,
  ADMIN_USER_SORT_FIELD.lastAccessAt,
] as const;

export const ADMIN_USER_SORT_DIRECTION_VALUES = [
  ADMIN_USER_SORT_DIRECTION.asc,
  ADMIN_USER_SORT_DIRECTION.desc,
] as const;
