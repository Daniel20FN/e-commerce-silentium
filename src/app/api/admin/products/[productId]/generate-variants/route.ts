import {
  adminProductLifecycleSchema,
  adminVariantGenerationConfirmSchema,
  adminVariantGenerationPreviewSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  confirmAdminVariantGeneration,
  previewAdminVariantGeneration,
  type AdminVariantGenerationConfirmResult,
  type AdminVariantGenerationPreviewResult,
} from "@/domains/admin/products/services/admin_variant_generation_service";
import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  isProductRouteError,
  isVariantGenerationError,
  mapProductRouteErrorStatus,
  parseJsonBody,
  resolveAdminRouteAccess,
} from "../../_shared";

interface ProductGenerationRouteProps {
  params: Promise<{
    productId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: ProductGenerationRouteProps,
): Promise<NextResponse> {
  const jsonBody =
    await parseJsonBody<AdminVariantGenerationPreviewResult>(request);

  if (!jsonBody.ok) {
    return jsonBody.response;
  }

  const payload = adminVariantGenerationPreviewSchema.safeParse(jsonBody.body);

  if (!payload.success) {
    return createProductJsonResponse<AdminVariantGenerationPreviewResult>(
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
    return createProductJsonResponse<AdminVariantGenerationPreviewResult>(
      {
        type: "validation_error",
        message:
          paramsValidation.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const access =
    await resolveAdminRouteAccess<AdminVariantGenerationPreviewResult>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const data = await previewAdminVariantGeneration(
      paramsValidation.data.productId,
      payload.data,
    );

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data,
    });
  } catch (error) {
    if (isVariantGenerationError(error)) {
      return createAuthorizedProductJsonResponse<AdminVariantGenerationPreviewResult>(
        access.supabaseResponse,
        {
          type: "validation_error",
          message: error.message,
        },
        400,
      );
    }

    if (isProductRouteError(error)) {
      return createAuthorizedProductJsonResponse<AdminVariantGenerationPreviewResult>(
        access.supabaseResponse,
        {
          type: error.type,
          message: error.message,
        },
        mapProductRouteErrorStatus(error.type),
      );
    }

    return createAuthorizedProductJsonResponse<AdminVariantGenerationPreviewResult>(
      access.supabaseResponse,
      {
        type: "internal_server_error",
        message: "internal_server_error",
      },
      500,
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: ProductGenerationRouteProps,
): Promise<NextResponse> {
  const jsonBody =
    await parseJsonBody<AdminVariantGenerationConfirmResult>(request);

  if (!jsonBody.ok) {
    return jsonBody.response;
  }

  const payload = adminVariantGenerationConfirmSchema.safeParse(jsonBody.body);

  if (!payload.success) {
    return createProductJsonResponse<AdminVariantGenerationConfirmResult>(
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
    return createProductJsonResponse<AdminVariantGenerationConfirmResult>(
      {
        type: "validation_error",
        message:
          paramsValidation.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const access =
    await resolveAdminRouteAccess<AdminVariantGenerationConfirmResult>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const data = await confirmAdminVariantGeneration(
      paramsValidation.data.productId,
      payload.data,
      access.actor,
    );

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data,
    });
  } catch (error) {
    if (isVariantGenerationError(error)) {
      return createAuthorizedProductJsonResponse<AdminVariantGenerationConfirmResult>(
        access.supabaseResponse,
        {
          type: "validation_error",
          message: error.message,
        },
        400,
      );
    }

    if (isProductRouteError(error)) {
      return createAuthorizedProductJsonResponse<AdminVariantGenerationConfirmResult>(
        access.supabaseResponse,
        {
          type: error.type,
          message: error.message,
        },
        mapProductRouteErrorStatus(error.type),
      );
    }

    return createAuthorizedProductJsonResponse<AdminVariantGenerationConfirmResult>(
      access.supabaseResponse,
      {
        type: "internal_server_error",
        message: "internal_server_error",
      },
      500,
    );
  }
}
