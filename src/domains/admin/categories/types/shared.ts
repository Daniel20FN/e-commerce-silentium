export const ADMIN_CATEGORY_STATUS = {
  active: "active",
  inactive: "inactive",
  all: "all",
} as const;

export type AdminCategoryStatusFilter =
  (typeof ADMIN_CATEGORY_STATUS)[keyof typeof ADMIN_CATEGORY_STATUS];

export const ADMIN_CATEGORY_HIERARCHY = {
  all: "all",
  root: "root",
  child: "child",
} as const;

export type AdminCategoryHierarchyFilter =
  (typeof ADMIN_CATEGORY_HIERARCHY)[keyof typeof ADMIN_CATEGORY_HIERARCHY];

export const ADMIN_CATEGORY_SORT_FIELD = {
  sortOrder: "sortOrder",
  name: "name",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type AdminCategorySortField =
  (typeof ADMIN_CATEGORY_SORT_FIELD)[keyof typeof ADMIN_CATEGORY_SORT_FIELD];

export const ADMIN_CATEGORY_SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

export type AdminCategorySortDirection =
  (typeof ADMIN_CATEGORY_SORT_DIRECTION)[keyof typeof ADMIN_CATEGORY_SORT_DIRECTION];

export const ADMIN_CATEGORY_BULK_ACTION = {
  activate: "activate",
  deactivate: "deactivate",
  trash: "trash",
  restore: "restore",
} as const;

export type AdminCategoryBulkAction =
  (typeof ADMIN_CATEGORY_BULK_ACTION)[keyof typeof ADMIN_CATEGORY_BULK_ACTION];

export const ADMIN_CATEGORY_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const ADMIN_CATEGORY_STATUS_VALUES = [
  ADMIN_CATEGORY_STATUS.active,
  ADMIN_CATEGORY_STATUS.inactive,
  ADMIN_CATEGORY_STATUS.all,
] as const;

export const ADMIN_CATEGORY_HIERARCHY_VALUES = [
  ADMIN_CATEGORY_HIERARCHY.all,
  ADMIN_CATEGORY_HIERARCHY.root,
  ADMIN_CATEGORY_HIERARCHY.child,
] as const;

export const ADMIN_CATEGORY_SORT_FIELD_VALUES = [
  ADMIN_CATEGORY_SORT_FIELD.sortOrder,
  ADMIN_CATEGORY_SORT_FIELD.name,
  ADMIN_CATEGORY_SORT_FIELD.createdAt,
  ADMIN_CATEGORY_SORT_FIELD.updatedAt,
] as const;

export const ADMIN_CATEGORY_SORT_DIRECTION_VALUES = [
  ADMIN_CATEGORY_SORT_DIRECTION.asc,
  ADMIN_CATEGORY_SORT_DIRECTION.desc,
] as const;

export const ADMIN_CATEGORY_BULK_ACTION_VALUES = [
  ADMIN_CATEGORY_BULK_ACTION.activate,
  ADMIN_CATEGORY_BULK_ACTION.deactivate,
  ADMIN_CATEGORY_BULK_ACTION.trash,
  ADMIN_CATEGORY_BULK_ACTION.restore,
] as const;
