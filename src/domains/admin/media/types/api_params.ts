import type { ApiResponse } from "@/types/api-service/api_response";

export interface CatalogImageDto {
  id: string;
  productId: string;
  variantId: string | null;
  bucket: string;
  path: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  altText: string;
  position: number;
  isPrimary: boolean;
  deletedAt: string | null;
}

export interface CatalogGalleryTarget {
  productId: string;
  variantId: string | null;
}

export interface CatalogGalleryData {
  uploadedImageId?: string;
  images: CatalogImageDto[];
  trash: CatalogImageDto[];
  resolvedImages: CatalogImageDto[];
  source: "variant" | "product" | "none";
  revision: string;
  limit: number;
}

export interface CatalogGalleryQuery {
  variantId?: string | null;
}

export interface CatalogGallerySaveParams {
  variantId: string | null;
  revision: string;
  images: { id: string; altText: string }[];
}

export interface CatalogGalleryRestoreParams {
  variantId: string | null;
  imageId: string;
  revision: string;
}

export interface CatalogImageUploadParams extends CatalogGalleryTarget {
  revision: string;
  file: File;
}

export type CatalogGalleryApiResponse = ApiResponse<CatalogGalleryData>;

export interface CatalogImagePrepareParams extends CatalogGalleryQuery {
  variantId: string | null;
  revision: string;
  fileName: string;
  contentType: string;
  size: number;
}
export interface CatalogImageFinishParams {
  variantId: string | null;
  imageId: string;
}
export interface CatalogImageUploadTicket {
  imageId: string;
  signedUrl: string;
}
export type CatalogImagePrepareApiResponse =
  ApiResponse<CatalogImageUploadTicket>;
export type CatalogImageCancelApiResponse = ApiResponse<{ cancelled: boolean }>;
