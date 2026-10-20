import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { getProductPublication } from "@/domains/admin/products/services/publication_service";
import type { AdminPublicationApiResponse } from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  resolveAdminRouteAccess,
} from "../../_shared";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse<AdminPublicationApiResponse>> {
  const access = await resolveAdminRouteAccess<{
    report: NonNullable<Awaited<ReturnType<typeof getProductPublication>>>;
  }>(request);
  if (!access.authorized) return access.response;
  const parsed = adminProductLifecycleSchema.safeParse(await params);
  if (!parsed.success)
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "validation_error", message: "validation_error" },
      400,
    );
  try {
    const report = await getProductPublication(parsed.data.productId);
    return report
      ? createAuthorizedProductJsonResponse(access.supabaseResponse, {
          data: { report },
        })
      : createAuthorizedProductJsonResponse(
          access.supabaseResponse,
          { type: "not_found", message: "record_not_found" },
          404,
        );
  } catch {
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}
