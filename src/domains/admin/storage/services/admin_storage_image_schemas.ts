import { ADMIN_STORAGE_IMAGE_SCOPE_VALUES } from "@/domains/admin/storage/types/shared";
import { z } from "zod";

const STORAGE_SEGMENT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,119}$/;

export const adminStorageImageUploadFieldsSchema = z.object({
  entityId: z
    .string()
    .trim()
    .regex(STORAGE_SEGMENT_PATTERN, {
      error: "invalid_entity_id",
    })
    .optional(),
  scope: z.enum(ADMIN_STORAGE_IMAGE_SCOPE_VALUES),
});
