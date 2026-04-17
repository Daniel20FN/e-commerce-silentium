import type { AdminStorageImageUploadFields } from "@/domains/admin/storage/types/api_params";
import {
  ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE,
  ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES,
  ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
  ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES,
} from "@/domains/admin/storage/types/shared";

export interface AdminStorageFileLike {
  name: string;
  size: number;
  type: string;
}

export interface AdminStorageImageValidationSuccess {
  file: AdminStorageFileLike;
  ok: true;
}

export interface AdminStorageImageValidationFailure {
  message: "file_too_large" | "image_required" | "unsupported_image_type";
  ok: false;
}

export type AdminStorageImageValidationResult =
  | AdminStorageImageValidationFailure
  | AdminStorageImageValidationSuccess;

const MIME_TYPE_EXTENSION_MAP = {
  [ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE.avif]: "avif",
  [ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE.jpeg]: "jpg",
  [ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE.png]: "png",
  [ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE.webp]: "webp",
} as const;

export { ADMIN_STORAGE_IMAGE_CACHE_CONTROL };

function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function getFileExtension(file: AdminStorageFileLike): string {
  const normalizedName = file.name.trim().toLowerCase();
  const segments = normalizedName.split(".");
  const extension = segments.length > 1 ? segments.at(-1) : undefined;

  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
    return extension;
  }

  return (
    MIME_TYPE_EXTENSION_MAP[
      file.type as keyof typeof MIME_TYPE_EXTENSION_MAP
    ] ?? "img"
  );
}

/**
 * Why: centraliza las reglas de validación para que cliente y servidor rechacen
 * archivos inválidos con la misma política antes de persistir metadata.
 */
export function validateAdminStorageImageFile(
  file: AdminStorageFileLike | null | undefined,
): AdminStorageImageValidationResult {
  if (!file || !file.type) {
    return {
      ok: false,
      message: "image_required",
    };
  }

  if (
    !ADMIN_STORAGE_ALLOWED_IMAGE_MIME_TYPE_VALUES.some(
      (allowedType) => allowedType === file.type,
    )
  ) {
    return {
      ok: false,
      message: "unsupported_image_type",
    };
  }

  if (file.size > ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: "file_too_large",
    };
  }

  return {
    ok: true,
    file,
  };
}

/**
 * Why: genera un path estable y seguro para Storage sin acoplarlo todavía a
 * entidades concretas del catálogo; el formulario futuro solo debe pasar scope
 * y, cuando exista, el identificador lógico del registro.
 */
export function buildAdminStorageImagePath(
  fields: AdminStorageImageUploadFields,
  file: AdminStorageFileLike,
  now = new Date(),
): string {
  const scopeSegment = sanitizeStorageSegment(fields.scope);
  const entitySegment = fields.entityId
    ? sanitizeStorageSegment(fields.entityId)
    : "unassigned";
  const fileNameSegment =
    sanitizeStorageSegment(file.name.replace(/\.[^.]+$/, "")) || "image";
  const extension = getFileExtension(file);
  const dateSegment = now.toISOString().slice(0, 10);

  return [
    "catalog",
    scopeSegment,
    entitySegment,
    dateSegment,
    `${crypto.randomUUID()}-${fileNameSegment}.${extension}`,
  ].join("/");
}
