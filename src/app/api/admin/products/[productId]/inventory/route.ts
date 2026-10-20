import {
  inventoryMinimumSchema,
  inventoryMutationSchema,
  inventoryQuerySchema,
} from "@/domains/admin/inventory/services/inventory_schemas";
import {
  getInventory,
  mutateInventory,
  setInventoryMinimum,
} from "@/domains/admin/inventory/services/inventory_service";
import type {
  InventoryApiResponse,
  InventoryData,
  InventoryMutationApiResponse,
} from "@/domains/admin/inventory/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  parseJsonBody,
  parseRequestParams,
  resolveAdminRouteAccess,
} from "../../_shared";

type Props = { params: Promise<{ productId: string }> };
export async function GET(
  request: NextRequest,
  { params }: Props,
): Promise<NextResponse<InventoryApiResponse>> {
  const access = await resolveAdminRouteAccess<InventoryData>(request);
  if (!access.authorized) return access.response;
  const respond = (data: InventoryApiResponse, status = 200) => {
    const response = createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      data,
      status,
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  };
  try {
    const query = inventoryQuerySchema.safeParse(parseRequestParams(request));
    if (!query.success)
      return respond(
        { type: "validation_error", message: "inventory_invalid" },
        400,
      );
    const { productId } = await params;
    return respond({ data: await getInventory(productId, query.data) });
  } catch (error) {
    if (isProductRouteError(error))
      return respond(
        { type: error.type, message: error.message },
        mapProductRouteErrorStatus(error.type),
      );
    console.error("inventory_read_failed", error);
    return respond(
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}
async function write(
  request: NextRequest,
  { params }: Props,
  minimum: boolean,
): Promise<NextResponse<InventoryMutationApiResponse>> {
  const access = await resolveAdminRouteAccess<{ operationId: string }>(
    request,
  );
  if (!access.authorized) return access.response;
  const respond = (data: InventoryMutationApiResponse, status = 200) => {
    const response = createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      data,
      status,
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  };
  try {
    const body = await parseJsonBody<{ operationId: string }>(request);
    if (!body.ok) return body.response;
    const { productId } = await params;
    if (minimum) {
      const input = inventoryMinimumSchema.safeParse(body.body);
      if (!input.success)
        return respond(
          { type: "validation_error", message: "inventory_invalid" },
          400,
        );
      return respond({
        data: await setInventoryMinimum(productId, input.data, access.actor),
      });
    }
    const input = inventoryMutationSchema.safeParse(body.body);
    if (!input.success)
      return respond(
        { type: "validation_error", message: "inventory_invalid" },
        400,
      );
    return respond({
      data: await mutateInventory(productId, input.data, access.actor),
    });
  } catch (error) {
    if (isProductRouteError(error))
      return respond(
        { type: error.type, message: error.message },
        mapProductRouteErrorStatus(error.type),
      );
    console.error("inventory_write_failed", error);
    return respond(
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}
export const POST = (request: NextRequest, props: Props) =>
  write(request, props, false);
export const PATCH = (request: NextRequest, props: Props) =>
  write(request, props, true);
