import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { duplicateProductSchema } from "@/domains/admin/products/services/catalog_operation_schemas";
import { duplicateProduct } from "@/domains/admin/products/services/duplicate_product_service";
import type {
  AdminDuplicateProductApiResponse,
  AdminDuplicateProductData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  mapProductRouteErrorStatus,
  parseJsonBody,
  resolveAdminRouteAccess,
} from "../../_shared";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse<AdminDuplicateProductApiResponse>> {
  const access =
    await resolveAdminRouteAccess<AdminDuplicateProductData>(request);
  if (!access.authorized) return access.response;
  const json = await parseJsonBody<AdminDuplicateProductData>(request);
  if (!json.ok)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "invalid_json" },
      400,
    );
  const route = adminProductLifecycleSchema.safeParse(await params);
  const input = duplicateProductSchema.safeParse(json.body);
  if (!route.success || !input.success)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "validation_error" },
      400,
    );
  try {
    const data = await duplicateProduct(route.data.productId, input.data);
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
