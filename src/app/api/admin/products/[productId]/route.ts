import {
  adminProductLifecycleSchema,
  adminProductUpsertSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  getAdminProductDetail,
  updateAdminProduct,
} from "@/domains/admin/products/services/admin_product_service";
import type {
  AdminProductDetailApiResponse,
  AdminProductDetailApiResponseData,
  AdminProductMutationApiResponse,
  AdminProductMutationApiResponseData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  parseJsonBody,
  resolveAdminRouteAccess,
} from "../_shared";

interface ProductRouteProps {
  params: Promise<{
    productId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: ProductRouteProps,
): Promise<NextResponse<AdminProductDetailApiResponse>> {
  const { productId } = await params;
  const paramsValidation = adminProductLifecycleSchema.safeParse({ productId });

  if (!paramsValidation.success) {
    return createProductJsonResponse(
      {
        type: "validation_error",
        message:
          paramsValidation.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const access =
    await resolveAdminRouteAccess<AdminProductDetailApiResponseData>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const product = await getAdminProductDetail(
      paramsValidation.data.productId,
    );

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: { product },
    });
  } catch (error) {
    if (isProductRouteError(error)) {
      return createAuthorizedProductJsonResponse(
        access.supabaseResponse,
        { type: error.type, message: error.message },
        mapProductRouteErrorStatus(error.type),
      );
    }

    return createAuthorizedProductJsonResponse(
      access.supabaseResponse,
      { type: "internal_server_error", message: "internal_server_error" },
      500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: ProductRouteProps,
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

  const { productId } = await params;
  const paramsValidation = adminProductLifecycleSchema.safeParse({ productId });

  if (!paramsValidation.success) {
    return createProductJsonResponse(
      {
        type: "validation_error",
        message:
          paramsValidation.error.issues[0]?.message ?? "validation_error",
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
    const product = await updateAdminProduct(
      paramsValidation.data.productId,
      payload.data,
    );

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
