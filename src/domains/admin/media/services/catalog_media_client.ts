import { ADMIN_STORAGE_IMAGE_CACHE_CONTROL } from "@/domains/admin/storage/types/shared";
import { apiService } from "@/types/api-service/api_service";
import type {
  CatalogGalleryApiResponse,
  CatalogGalleryQuery,
  CatalogImageCancelApiResponse,
  CatalogImageFinishParams,
  CatalogImagePrepareApiResponse,
  CatalogImagePrepareParams,
  CatalogImageUploadParams,
} from "../types/api_params";

export async function uploadCatalogImageFile(
  params: CatalogImageUploadParams,
): Promise<CatalogGalleryApiResponse["data"]> {
  const endpoint = `/admin/products/${params.productId}/media`;
  const ticket = await apiService.post<
    CatalogImagePrepareApiResponse,
    CatalogImagePrepareParams
  >(endpoint + "/upload", {
    variantId: params.variantId,
    revision: params.revision,
    fileName: params.file.name,
    contentType: params.file.type,
    size: params.file.size,
  });
  if (!ticket) throw new Error("media_upload_failed");
  const finish = { variantId: params.variantId, imageId: ticket.imageId };
  try {
    await apiService.uploadSignedFile(
      ticket.signedUrl,
      params.file,
      ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
    );
    return await apiService.put<
      CatalogGalleryApiResponse,
      CatalogImageFinishParams
    >(endpoint + "/upload", finish);
  } catch (error) {
    try {
      const current = await apiService.get<
        CatalogGalleryApiResponse,
        CatalogGalleryQuery
      >(endpoint, { variantId: params.variantId });
      if (current?.images.some((image) => image.id === ticket.imageId))
        return { ...current, uploadedImageId: ticket.imageId };
      await apiService.delete<
        CatalogImageCancelApiResponse,
        CatalogImageFinishParams
      >(endpoint + "/upload", finish);
    } catch {
      /* A failed connection leaves a traceable pending reservation, never a published image. */
    }
    throw error;
  }
}
