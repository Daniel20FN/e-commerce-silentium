import type { AdminProductErrorCode } from "./product_errors";

export const ADMIN_PRODUCT_STATUS = {
  draft: "draft",
  active: "active",
  inactive: "inactive",
  archived: "archived",
} as const;

export type AdminProductStatus =
  (typeof ADMIN_PRODUCT_STATUS)[keyof typeof ADMIN_PRODUCT_STATUS];

export const ADMIN_PRODUCT_UPSERT_STATUS = {
  draft: ADMIN_PRODUCT_STATUS.draft,
  active: ADMIN_PRODUCT_STATUS.active,
  inactive: ADMIN_PRODUCT_STATUS.inactive,
} as const;

export type AdminProductUpsertStatus =
  (typeof ADMIN_PRODUCT_UPSERT_STATUS)[keyof typeof ADMIN_PRODUCT_UPSERT_STATUS];

export const ADMIN_PRODUCT_SORT_FIELD = {
  name: "name",
  status: "status",
  brand: "brand",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type AdminProductSortField =
  (typeof ADMIN_PRODUCT_SORT_FIELD)[keyof typeof ADMIN_PRODUCT_SORT_FIELD];

export const ADMIN_PRODUCT_SORT_DIRECTION = {
  asc: "asc",
  desc: "desc",
} as const;

export type AdminProductSortDirection =
  (typeof ADMIN_PRODUCT_SORT_DIRECTION)[keyof typeof ADMIN_PRODUCT_SORT_DIRECTION];

export const ADMIN_PRODUCT_BULK_ACTION = {
  activate: "activate",
  deactivate: "deactivate",
  trash: "trash",
  restore: "restore",
  archive: "archive",
} as const;

export type AdminProductBulkAction =
  (typeof ADMIN_PRODUCT_BULK_ACTION)[keyof typeof ADMIN_PRODUCT_BULK_ACTION];

export const ADMIN_PRODUCT_STATUS_VALUES = [
  ADMIN_PRODUCT_STATUS.draft,
  ADMIN_PRODUCT_STATUS.active,
  ADMIN_PRODUCT_STATUS.inactive,
  ADMIN_PRODUCT_STATUS.archived,
] as const;

export const ADMIN_PRODUCT_UPSERT_STATUS_VALUES = [
  ADMIN_PRODUCT_UPSERT_STATUS.draft,
  ADMIN_PRODUCT_UPSERT_STATUS.active,
  ADMIN_PRODUCT_UPSERT_STATUS.inactive,
] as const;

export interface AdminProductCategoryDto {
  id: string;
  name: string;
  slug: string;
  isPrimary: boolean;
}

export interface AdminProductListItemDto {
  id: string;
  name: string;
  slug: string;
  status: AdminProductStatus;
  inTrash: boolean;
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  primaryCategory: AdminProductCategoryDto | null;
  categories: AdminProductCategoryDto[];
  variantCount: number;
  sellableVariantCount: number;
  hasSellableVariants: boolean;
  warnings: AdminProductErrorCode[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductOptionValueDto {
  id: string;
  value: string;
  displayOrder: number;
}

export interface AdminProductOptionDto {
  id: string;
  name: string;
  displayOrder: number;
  values: AdminProductOptionValueDto[];
}

export interface AdminProductDetailDto extends AdminProductListItemDto {
  options: AdminProductOptionDto[];
  optionsLocked: boolean;
}

export interface AdminProductVariantOptionValueDto {
  optionId: string;
  optionName: string;
  optionValueId: string;
  optionValue: string;
}

export interface AdminProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  active: boolean;
  isDefault: boolean;
  displayOrder: number;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  lengthMm: number | null;
  optionValues: AdminProductVariantOptionValueDto[];
  inTrash: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetailApiResponseData {
  product: AdminProductDetailDto;
}

export interface AdminProductsListApiResponseData {
  items: AdminProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminProductMutationApiResponseData {
  product: AdminProductListItemDto;
}

export interface AdminProductVariantsListApiResponseData {
  items: AdminProductVariantDto[];
}

export interface AdminVariantMutationApiResponseData {
  variant: AdminProductVariantDto;
}
