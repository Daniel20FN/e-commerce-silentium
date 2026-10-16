import {
  adminProductsListParamsSchema,
  adminProductUpsertSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  createAdminProduct,
  listAdminProducts,
} from "@/domains/admin/products/services/admin_product_service";
import type {
  AdminProductMutationApiResponse,
  AdminProductMutationApiResponseData,
  AdminProductsListApiResponse,
  AdminProductsListApiResponseData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  parseJsonBody,
  parseRequestParams,
  resolveAdminRouteAccess,
} from "./_shared";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AdminProductsListApiResponse>> {
  const payload = adminProductsListParamsSchema.safeParse(
    parseRequestParams(request),
  );

  if (!payload.success) {
    return createProductJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const access =
    await resolveAdminRouteAccess<AdminProductsListApiResponseData>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const data = await listAdminProducts(payload.data);

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data,
    });
  } catch {
    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      {
        type: "internal_server_error",
        message: "internal_server_error",
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AdminProductMutationApiResponse>> {
  const jsonBody =
    await parseJsonBody<AdminProductMutationApiResponseData>(request);

  if (!jsonBody.ok) {
    return jsonBody.response;
  }

  const payload = adminProductUpsertSchema.safeParse(jsonBody.body);

  if (!payload.success) {
    return createProductJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const access =
    await resolveAdminRouteAccess<AdminProductMutationApiResponseData>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const product = await createAdminProduct(payload.data);

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: {
        product,
      },
    });
  } catch (error) {
    if (isProductRouteError(error)) {
      return createAuthorizedProductJsonResponse(
        access.supabaseResponse,
        {
          type: error.type,
          message: error.message,
        },
        mapProductRouteErrorStatus(error.type),
      );
    }

    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      {
        type: "internal_server_error",
        message: "internal_server_error",
      },
      500,
    );
  }
}
