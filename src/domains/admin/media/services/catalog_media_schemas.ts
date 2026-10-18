import {
  ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES,
  ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES,
} from "@/domains/admin/storage/types/shared";
import { z } from "zod";
import {
  CATALOG_PRODUCT_IMAGE_LIMIT,
  CATALOG_VARIANT_IMAGE_LIMIT,
} from "./catalog_media_rules";

const id = z.string().trim().min(1).max(128);
export const galleryQuerySchema = z
  .object({ variantId: id.nullish() })
  .strict();
export const galleryUploadSchema = z
  .object({
    variantId: id.nullable(),
    revision: z.string().length(64),
  })
  .strict();
export const gallerySaveSchema = galleryUploadSchema
  .extend({
    images: z
      .array(z.object({ id, altText: z.string().trim().max(500) }).strict())
      .max(Math.max(CATALOG_PRODUCT_IMAGE_LIMIT, CATALOG_VARIANT_IMAGE_LIMIT))
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
      ),
  })
  .strict();
export const galleryRestoreSchema = galleryUploadSchema
  .extend({ imageId: id })
  .strict();

export const imagePrepareSchema = galleryUploadSchema
  .extend({
    fileName: z.string().trim().min(1).max(255),
    contentType: z
      .string()
      .refine((value) =>
        ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES.some(
          (type) => type === value,
        ),
      ),
    size: z
      .number()
      .int()
      .positive()
      .max(ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES),
  })
  .strict();
export const imageFinishSchema = z
  .object({ variantId: id.nullable(), imageId: id })
  .strict();
