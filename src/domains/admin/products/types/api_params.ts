import type { ApiResponse } from "@/types/api-service/api_response";
import type {
  AdminProductBulkAction,
  AdminProductDetailApiResponseData,
  AdminProductMutationApiResponseData,
  AdminProductSortDirection,
  AdminProductSortField,
  AdminProductStatus,
  AdminProductUpsertStatus,
  AdminProductVariantsListApiResponseData,
  AdminProductsListApiResponseData,
  AdminVariantMutationApiResponseData,
} from "./product_dto";
import type { PublicationReport } from "./publication";

export type AdminPublicationApiResponse = ApiResponse<{
  report: PublicationReport;
}>;

export type {
  AdminProductDetailApiResponseData,
  AdminProductMutationApiResponseData,
  AdminProductVariantsListApiResponseData,
  AdminProductsListApiResponseData,
  AdminVariantMutationApiResponseData,
} from "./product_dto";

export interface AdminProductsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminProductStatus | "all";
  categoryId?: string;
  brand?: string;
  featured?: boolean;
  inTrash?: boolean;
  stock?: "all" | "in_stock" | "out_of_stock";
  discounted?: boolean;
  sortField?: AdminProductSortField;
  sortDirection?: AdminProductSortDirection;
}

export interface AdminProductOptionValueParams {
  id?: string;
  value: string;
  displayOrder: number;
}

export interface AdminProductOptionParams {
  id?: string;
  name: string;
  displayOrder: number;
  values: AdminProductOptionValueParams[];
}

export interface AdminProductUpsertParams {
  expectedUpdatedAt?: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  brand?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featured: boolean;
  status: AdminProductUpsertStatus;
  categoryIds: string[];
  primaryCategoryId: string;
  options?: AdminProductOptionParams[];
}

export interface AdminVariantUpsertParams {
  expectedUpdatedAt?: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  stock: number;
  active: boolean;
  isDefault: boolean;
  displayOrder: number;
  weightGrams?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthMm?: number | null;
  optionValueIds: string[];
}

export interface AdminProductLifecycleParams {
  productId: string;
}

export interface AdminProductBulkActionParams {
  action: AdminProductBulkAction;
  productIds: string[];
}

export interface AdminVariantGenerationPreviewParams {
  optionIds: string[];
}

export interface AdminVariantGenerationConfirmParams {
  variants: AdminVariantUpsertParams[];
}

export type AdminProductsListApiResponse =
  ApiResponse<AdminProductsListApiResponseData>;
export type AdminProductDetailApiResponse =
  ApiResponse<AdminProductDetailApiResponseData>;
export type AdminProductMutationApiResponse =
  ApiResponse<AdminProductMutationApiResponseData>;
export type AdminProductVariantsListApiResponse =
  ApiResponse<AdminProductVariantsListApiResponseData>;
export type AdminVariantMutationApiResponse =
  ApiResponse<AdminVariantMutationApiResponseData>;

export interface AdminVariantLifecycleParams {
  productId: string;
  variantId: string;
  action: "trash" | "restore";
}
