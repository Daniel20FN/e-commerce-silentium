import {
  costInputSchema,
  costLifecycleSchema,
  costUpdateSchema,
} from "@/domains/admin/costs/services/cost_schemas";
import {
  CatalogCostError,
  changeCatalogCostState,
  createCatalogCost,
  getCatalogCosts,
  updateCatalogCost,
} from "@/domains/admin/costs/services/cost_service";
import type {
  CatalogCostsApiResponse,
  CatalogCostsData,
} from "@/domains/admin/costs/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  mapProductRouteErrorStatus,
  resolveAdminRouteAccess,
} from "../../_shared";

export const runtime = "nodejs";
type Context = { params: Promise<{ productId: string }> };
async function handle(
  request: NextRequest,
  context: Context,
  method: "GET" | "POST" | "PUT" | "PATCH",
): Promise<NextResponse<CatalogCostsApiResponse>> {
  let cookies: NextResponse<null> | undefined;
  try {
    const access = await resolveAdminRouteAccess<CatalogCostsData>(request);
    if (!access.authorized) return access.response;
    cookies = access.supabaseResponse;
    const { productId } = await context.params;
    let data: CatalogCostsData;
    if (method === "GET") data = await getCatalogCosts(productId);
    else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        throw new CatalogCostError("validation_error", "cost_invalid");
      }
      if (method === "POST") {
        const parsed = costInputSchema.safeParse(body);
        if (!parsed.success)
          throw new CatalogCostError("validation_error", "cost_invalid");
        data = await createCatalogCost(productId, parsed.data);
      } else if (method === "PUT") {
        const parsed = costUpdateSchema.safeParse(body);
        if (!parsed.success)
          throw new CatalogCostError("validation_error", "cost_invalid");
        data = await updateCatalogCost(productId, parsed.data);
      } else {
        const parsed = costLifecycleSchema.safeParse(body);
        if (!parsed.success)
          throw new CatalogCostError("validation_error", "cost_invalid");
        data = await changeCatalogCostState(productId, parsed.data);
      }
    }
    return createAuthorizedProductJsonResponse(
      cookies,
      { data },
      method === "POST" ? 201 : 200,
    );
  } catch (error) {
    const known = error instanceof CatalogCostError;
    if (!known) console.error("Catalog costs request failed", error);
    const type = known ? error.type : "internal_server_error";
    const response: CatalogCostsApiResponse = {
      type,
      message: known ? error.message : "internal_server_error",
    };
    const status = known ? mapProductRouteErrorStatus(error.type) : 500;
    return cookies
      ? createAuthorizedProductJsonResponse<CatalogCostsData>(
          cookies,
          response,
          status,
        )
      : createProductJsonResponse<CatalogCostsData>(response, status);
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
