import type {
  AdminCategoryBulkAction,
  AdminCategoryHierarchyFilter,
  AdminCategorySortDirection,
  AdminCategorySortField,
  AdminCategoryStatusFilter,
} from "./shared";

export interface AdminCategoriesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminCategoryStatusFilter;
  hierarchy?: AdminCategoryHierarchyFilter;
  inTrash?: boolean;
  parentId?: string;
  sortField?: AdminCategorySortField;
  sortDirection?: AdminCategorySortDirection;
}

export interface AdminCategoryUpsertParams {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface AdminCategoryTrashParams {
  categoryId: string;
}

export interface AdminCategoryRestoreParams {
  categoryId: string;
}

export interface AdminCategoryBulkActionParams {
  action: AdminCategoryBulkAction;
  categoryIds: string[];
}
