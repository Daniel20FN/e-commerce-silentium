import type { AdminStorageImageUploadParams } from "@/domains/admin/storage/types/api_params";
import type {
  AdminStorageImageAsset,
  AdminStorageImageUploadApiResponse,
} from "@/domains/admin/storage/types/api_responses";
import { validateAdminStorageImageFile } from "./admin_storage_image";

/**
 * Why: ofrece un boundary tipado para multipart/form-data sin forzar a que los
 * formularios futuros reimplementen fetch, FormData ni parsing de ApiResponse.
 */
export async function uploadAdminStorageImage(
  params: AdminStorageImageUploadParams,
): Promise<AdminStorageImageAsset> {
  const validation = validateAdminStorageImageFile(params.file);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const formData = new FormData();
  formData.set("file", params.file);
  formData.set("scope", params.scope);

  if (params.entityId) {
    formData.set("entityId", params.entityId);
  }

  const response = await fetch("/api/admin/storage/images", {
    method: "POST",
    body: formData,
    signal: params.signal,
  });

  const payload = (await response.json()) as AdminStorageImageUploadApiResponse;

  if (payload.type) {
    throw new Error(payload.message ?? payload.type);
  }

  return payload.data;
}
