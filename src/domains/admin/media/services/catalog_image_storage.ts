import {
  ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
  buildAdminStorageImagePath,
  validateAdminStorageImageFile,
  type AdminStorageFileLike,
} from "@/domains/admin/storage/services/admin_storage_image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseCatalogStorageBucket } from "@/lib/supabase/shared";
import "server-only";
import type { CatalogGalleryTarget } from "../types/api_params";
import { CatalogMediaError } from "./catalog_media_error";

export interface ReservedImageAsset {
  bucket: string;
  path: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
}

export function describeImageUpload(
  target: CatalogGalleryTarget,
  file: AdminStorageFileLike,
): ReservedImageAsset {
  const validation = validateAdminStorageImageFile(file);
  if (!validation.ok)
    throw new CatalogMediaError("validation_error", validation.message);
  if (!file.size)
    throw new CatalogMediaError("validation_error", "image_required");
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const path = buildAdminStorageImagePath(
    {
      scope: target.variantId ? "variant" : "product",
      entityId: target.variantId ?? target.productId,
    },
    {
      name: `${file.name.replace(/\.[^.]*$/, "")}.${extensions[file.type]}`,
      type: file.type,
      size: file.size,
    },
  );
  const bucket = getSupabaseCatalogStorageBucket();
  return {
    bucket,
    path,
    publicUrl: createSupabaseAdminClient()
      .storage.from(bucket)
      .getPublicUrl(path).data.publicUrl,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  };
}

export async function validateImageSignature(file: Blob): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const text = new TextDecoder("ascii").decode(bytes);
  const valid =
    (file.type === "image/jpeg" &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff) ||
    (file.type === "image/png" &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (value, index) => bytes[index] === value,
      )) ||
    (file.type === "image/webp" &&
      text.startsWith("RIFF") &&
      text.slice(8, 12) === "WEBP") ||
    (file.type === "image/avif" &&
      text.slice(4, 8) === "ftyp" &&
      /avif|avis/.test(text.slice(8)));
  if (!valid)
    throw new CatalogMediaError("validation_error", "unsupported_image_type");
}

export async function signReservedImage(
  asset: ReservedImageAsset,
): Promise<string> {
  const storage = createSupabaseAdminClient().storage;
  const bucket = await storage.getBucket(asset.bucket);
  if (bucket.error || !bucket.data?.public)
    throw new CatalogMediaError("invalid_state", "media_storage_unavailable");
  const { data, error } = await storage
    .from(asset.bucket)
    .createSignedUploadUrl(asset.path, { upsert: false });
  if (error || !data)
    throw new CatalogMediaError("internal_server_error", "media_upload_failed");
  return data.signedUrl;
}

export async function validateStoredImage(
  asset: ReservedImageAsset,
): Promise<void> {
  const { data, error } = await createSupabaseAdminClient()
    .storage.from(asset.bucket)
    .download(asset.path);
  if (error || !data)
    throw new CatalogMediaError("internal_server_error", "media_upload_failed");
  if (data.size !== asset.size || data.type !== asset.contentType)
    throw new CatalogMediaError("validation_error", "unsupported_image_type");
  await validateImageSignature(data);
}

export async function uploadReservedImage(
  asset: ReservedImageAsset,
  file: File,
): Promise<void> {
  await validateImageSignature(file);
  const storage = createSupabaseAdminClient().storage;
  const bucket = await storage.getBucket(asset.bucket);
  if (bucket.error || !bucket.data?.public) {
    throw new CatalogMediaError("invalid_state", "media_storage_unavailable");
  }
  const { error } = await storage.from(asset.bucket).upload(asset.path, file, {
    contentType: asset.contentType,
    cacheControl: ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
    upsert: false,
  });
  if (error)
    throw new CatalogMediaError("internal_server_error", "media_upload_failed");
}
