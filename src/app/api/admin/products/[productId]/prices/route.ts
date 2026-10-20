import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { priceBatchSchema } from "@/domains/admin/products/services/catalog_operation_schemas";
import { updatePriceBatch } from "@/domains/admin/products/services/price_batch_service";
import type {
  AdminPriceBatchApiResponse,
  AdminPriceBatchData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  mapProductRouteErrorStatus,
  parseJsonBody,
  resolveAdminRouteAccess,
} from "../../_shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse<AdminPriceBatchApiResponse>> {
  const access = await resolveAdminRouteAccess<AdminPriceBatchData>(request);
  if (!access.authorized) return access.response;
  const json = await parseJsonBody<AdminPriceBatchData>(request);
  if (!json.ok)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "invalid_json" },
      400,
    );
  const route = adminProductLifecycleSchema.safeParse(await params);
  const input = priceBatchSchema.safeParse(json.body);
  if (!route.success || !input.success)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "validation_error" },
      400,
    );
  try {
    const data = await updatePriceBatch(route.data.productId, input.data);
    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data,
    });
  } catch (error) {
    if (error instanceof CatalogOperationError)
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
