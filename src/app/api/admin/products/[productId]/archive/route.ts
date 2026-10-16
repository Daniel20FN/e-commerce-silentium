import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { archiveAdminProduct } from "@/domains/admin/products/services/admin_product_service";
import type {
  AdminProductMutationApiResponse,
  AdminProductMutationApiResponseData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  resolveAdminRouteAccess,
} from "../../_shared";

interface ProductLifecycleRouteProps {
  params: Promise<{
    productId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: ProductLifecycleRouteProps,
): Promise<NextResponse<AdminProductMutationApiResponse>> {
  const { productId } = await params;
  const payload = adminProductLifecycleSchema.safeParse({ productId });

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
    const product = await archiveAdminProduct(payload.data.productId);

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
