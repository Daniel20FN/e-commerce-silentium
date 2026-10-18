import { CatalogMediaError } from "@/domains/admin/media/services/catalog_media_error";
import {
  imageFinishSchema,
  imagePrepareSchema,
} from "@/domains/admin/media/services/catalog_media_schemas";
import {
  cancelCatalogImageUpload,
  completeCatalogImageUpload,
  prepareCatalogImageUpload,
} from "@/domains/admin/media/services/catalog_media_service";
import type {
  CatalogGalleryData,
  CatalogImageUploadTicket,
} from "@/domains/admin/media/types/api_params";
import type { ApiResponse } from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  mapProductRouteErrorStatus,
  resolveAdminRouteAccess,
} from "../../../_shared";

export const runtime = "nodejs";
type Context = { params: Promise<{ productId: string }> };
type Data =
  | CatalogGalleryData
  | CatalogImageUploadTicket
  | { cancelled: boolean };
async function handle(
  request: NextRequest,
  context: Context,
  method: "POST" | "PUT" | "DELETE",
): Promise<NextResponse<ApiResponse<Data>>> {
  let cookies: NextResponse<null> | undefined;
  try {
    const access = await resolveAdminRouteAccess<Data>(request);
    if (!access.authorized) return access.response;
    cookies = access.supabaseResponse;
    const { productId } = await context.params;
    if (!productId || productId.length > 128)
      throw new CatalogMediaError("validation_error", "media_invalid_gallery");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new CatalogMediaError("validation_error", "media_invalid_gallery");
    }
    let data: Data;
    if (method === "POST") {
      const parsed = imagePrepareSchema.safeParse(body);
      if (!parsed.success)
        throw new CatalogMediaError(
          "validation_error",
          "media_invalid_gallery",
        );
      data = await prepareCatalogImageUpload({ productId, ...parsed.data });
    } else {
      const parsed = imageFinishSchema.safeParse(body);
      if (!parsed.success)
        throw new CatalogMediaError(
          "validation_error",
          "media_invalid_gallery",
        );
      const target = { productId, variantId: parsed.data.variantId };
      data =
        method === "PUT"
          ? await completeCatalogImageUpload(target, parsed.data.imageId)
          : await cancelCatalogImageUpload(target, parsed.data.imageId);
    }
    return createAuthorizedProductJsonResponse(
      cookies,
      { data },
      method === "POST" ? 201 : 200,
    );
  } catch (error) {
    const type =
      error instanceof CatalogMediaError ? error.type : "internal_server_error";
    const body: ApiResponse<Data> = {
      type,
      message:
        error instanceof CatalogMediaError
          ? error.message
          : "internal_server_error",
    };
    const status =
      type === "internal_server_error" ? 500 : mapProductRouteErrorStatus(type);
    return cookies
      ? createAuthorizedProductJsonResponse<Data>(cookies, body, status)
      : createProductJsonResponse<Data>(body, status);
  }
}
export async function POST(request: NextRequest, context: Context) {
  return handle(request, context, "POST");
}
export async function PUT(request: NextRequest, context: Context) {
  return handle(request, context, "PUT");
}
export async function DELETE(request: NextRequest, context: Context) {
  return handle(request, context, "DELETE");
}
