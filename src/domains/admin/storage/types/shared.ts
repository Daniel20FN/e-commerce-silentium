export const ADMIN_STORAGE_IMAGE_SCOPE = {
  category: "category",
  product: "product",
  shared: "shared",
  variant: "variant",
} as const;

export type AdminStorageImageScope =
  (typeof ADMIN_STORAGE_IMAGE_SCOPE)[keyof typeof ADMIN_STORAGE_IMAGE_SCOPE];

export const ADMIN_STORAGE_IMAGE_SCOPE_VALUES = Object.values(
  ADMIN_STORAGE_IMAGE_SCOPE,
);

export const ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type AdminStorageAllowedImageMimeType =
  (typeof ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE)[keyof typeof ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE];

export const ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES = Object.values(
  ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE,
);

export const ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_MB = 5;

export const ADMIN_STORAGE_IMAGE_CACHE_CONTROL = "31536000";
