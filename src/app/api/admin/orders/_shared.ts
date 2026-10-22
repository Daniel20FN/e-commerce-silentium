import type { InventoryActor } from "@/domains/admin/inventory/services/inventory_context";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import type { ApiResponse } from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  resolveAdminRouteAccess,
} from "../products/_shared";

export async function orderRoute<T>(
  request: NextRequest,
  execute: (actor: InventoryActor) => Promise<T>,
): Promise<NextResponse<ApiResponse<T>>> {
  const access = await resolveAdminRouteAccess<T>(request);
  if (!access.authorized) return access.response;
  try {
    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: await execute(access.actor),
    });
  } catch (error) {
    if (isProductRouteError(error)) {
      return createAuthorizedProductJsonResponse(
        access.supabaseResponse,
        { type: error.type, message: error.message },
        mapProductRouteErrorStatus(error.type),
      );
    }
    // Do not log customer payloads or database errors containing private order data.
    console.error("admin_order_operation_failed");
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}

export async function orderJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new CatalogOperationError("validation_error", "order_invalid");
  }
}

export function invalidOrder(): never {
  throw new CatalogOperationError("validation_error", "order_invalid");
}
