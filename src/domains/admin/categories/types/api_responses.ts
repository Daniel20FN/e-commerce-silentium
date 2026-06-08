import type { ApiResponse } from "@/types/api-service/api_response";

export interface AdminCategoryListItemDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  parentIsActive?: boolean | null;
  parentInTrash?: boolean;
  isActive: boolean;
  inTrash: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  productsCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategoriesListApiResponseData {
  items: AdminCategoryListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminCategoryParentOptionDto {
  id: string;
  name: string;
}

export interface AdminCategoryParentOptionsApiResponseData {
  items: AdminCategoryParentOptionDto[];
}

export interface AdminCategoryMutationApiResponseData {
  category: AdminCategoryListItemDto;
  restoreWarnings?: string[];
}

export interface AdminCategoryBulkExceptionDto {
  categoryId: string;
  type: "validation_error" | "conflict" | "not_found" | "invalid_state";
  message: string;
}

export interface AdminCategoryBulkActionApiResponseData {
  processed: number;
  successCount: number;
  exceptions: AdminCategoryBulkExceptionDto[];
}

export type AdminCategoriesListApiResponse =
  ApiResponse<AdminCategoriesListApiResponseData>;
export type AdminCategoryParentOptionsApiResponse =
  ApiResponse<AdminCategoryParentOptionsApiResponseData>;
export type AdminCategoryMutationApiResponse =
  ApiResponse<AdminCategoryMutationApiResponseData>;
export type AdminCategoryBulkActionApiResponse =
  ApiResponse<AdminCategoryBulkActionApiResponseData>;
