import { CatalogMediaError } from "@/domains/admin/media/services/catalog_media_error";
import {
  galleryQuerySchema,
  galleryRestoreSchema,
  gallerySaveSchema,
  galleryUploadSchema,
} from "@/domains/admin/media/services/catalog_media_schemas";
import {
  getCatalogGallery,
  restoreCatalogImage,
  saveCatalogGallery,
  uploadCatalogImage,
} from "@/domains/admin/media/services/catalog_media_service";
import type {
  CatalogGalleryApiResponse,
  CatalogGalleryData,
} from "@/domains/admin/media/types/api_params";
import { ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES } from "@/domains/admin/storage/types/shared";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  mapProductRouteErrorStatus,
  parseRequestParams,
  resolveAdminRouteAccess,
} from "../../_shared";

export const runtime = "nodejs";
type Context = { params: Promise<{ productId: string }> };
type Method = "GET" | "POST" | "PUT" | "PATCH";

async function readImageForm(request: NextRequest): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader)
    throw new CatalogMediaError("validation_error", "image_required");
  const chunks: BlobPart[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > ADMIN_STORAGE_MAX_IMAGE_FILE_SIZE_BYTES + 64 * 1024) {
        await reader.cancel();
        throw new CatalogMediaError("validation_error", "file_too_large");
      }
      chunks.push(new Uint8Array(chunk.value));
    }
    return await new Response(new Blob(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    if (error instanceof CatalogMediaError) throw error;
    throw new CatalogMediaError("validation_error", "media_invalid_gallery");
  } finally {
    reader.releaseLock();
  }
}

async function handle(
  request: NextRequest,
  context: Context,
  method: Method,
): Promise<NextResponse<CatalogGalleryApiResponse>> {
  let supabaseResponse: NextResponse<null> | undefined;
  try {
    const access = await resolveAdminRouteAccess<CatalogGalleryData>(request);
    if (!access.authorized) return access.response;
    supabaseResponse = access.supabaseResponse;
    const { productId } = await context.params;
    if (!productId || productId.length > 128)
      throw new CatalogMediaError("validation_error", "media_invalid_gallery");
    let data: CatalogGalleryData;
    if (method === "GET") {
      const parsed = galleryQuerySchema.safeParse(parseRequestParams(request));
      if (!parsed.success)
        throw new CatalogMediaError(
          "validation_error",
          "media_invalid_gallery",
        );
      data = await getCatalogGallery({
        productId,
        variantId: parsed.data.variantId ?? null,
      });
    } else if (method === "POST") {
      const form = await readImageForm(request);
      const parsed = galleryUploadSchema.safeParse({
        variantId: form.get("variantId") || null,
        revision: form.get("revision"),
      });
      const file = form.get("file");
      if (!parsed.success || !(file instanceof File))
        throw new CatalogMediaError(
          "validation_error",
          "media_invalid_gallery",
        );
      data = await uploadCatalogImage({ productId, ...parsed.data, file });
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        throw new CatalogMediaError(
          "validation_error",
          "media_invalid_gallery",
        );
      }
      if (method === "PUT") {
        const parsed = gallerySaveSchema.safeParse(body);
        if (!parsed.success)
          throw new CatalogMediaError(
            "validation_error",
            "media_invalid_gallery",
          );
        data = await saveCatalogGallery(
          { productId, variantId: parsed.data.variantId },
          parsed.data,
        );
      } else {
        const parsed = galleryRestoreSchema.safeParse(body);
        if (!parsed.success)
          throw new CatalogMediaError(
            "validation_error",
            "media_invalid_gallery",
          );
        data = await restoreCatalogImage(
          { productId, variantId: parsed.data.variantId },
          parsed.data.imageId,
          parsed.data.revision,
        );
      }
    }
    return createAuthorizedProductJsonResponse(
      supabaseResponse,
      { data },
      method === "POST" ? 201 : 200,
    );
  } catch (error) {
    const known = error instanceof CatalogMediaError;
    const type = known ? error.type : "internal_server_error";
    const body: CatalogGalleryApiResponse = {
      type,
      message: known ? error.message : "internal_server_error",
    };
    const status =
      type === "internal_server_error" ? 500 : mapProductRouteErrorStatus(type);
    return supabaseResponse
      ? createAuthorizedProductJsonResponse<CatalogGalleryData>(
          supabaseResponse,
          body,
          status,
        )
      : createProductJsonResponse<CatalogGalleryData>(body, status);
  }
}

export async function GET(request: NextRequest, context: Context) {
  return handle(request, context, "GET");
}
export async function POST(request: NextRequest, context: Context) {
  return handle(request, context, "POST");
}
export async function PUT(request: NextRequest, context: Context) {
  return handle(request, context, "PUT");
}
export async function PATCH(request: NextRequest, context: Context) {
  return handle(request, context, "PATCH");
}
