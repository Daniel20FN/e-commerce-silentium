import { adminVariantLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import {
  restoreAdminVariant,
  softDeleteAdminVariant,
} from "@/domains/admin/products/services/admin_variant_service";
import type {
  AdminVariantLifecycleParams,
  AdminVariantMutationApiResponse,
  AdminVariantMutationApiResponseData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  resolveAdminRouteAccess,
} from "../../../../_shared";

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<
      Omit<AdminVariantLifecycleParams, "action"> & { action: string }
    >;
  },
): Promise<NextResponse<AdminVariantMutationApiResponse>> {
  const access =
    await resolveAdminRouteAccess<AdminVariantMutationApiResponseData>(request);
  if (!access.authorized) return access.response;
  const parsed = adminVariantLifecycleSchema.safeParse(await params);
  if (!parsed.success)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "validation_error" },
      400,
    );
  try {
    const { productId, variantId, action } = parsed.data;
    const variant =
      action === "trash"
        ? await softDeleteAdminVariant(productId, variantId)
        : await restoreAdminVariant(productId, variantId);
    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: { variant },
    });
  } catch (error) {
    if (isProductRouteError(error))
      return createAuthorizedProductJsonResponse(
        access.supabaseResponse,
        { type: error.type, message: error.message },
        mapProductRouteErrorStatus(error.type),
      );
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}
