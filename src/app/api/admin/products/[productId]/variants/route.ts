import {
  adminProductLifecycleSchema,
  adminVariantUpsertSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  createAdminVariant,
  listAdminProductVariants,
  updateAdminVariant,
} from "@/domains/admin/products/services/admin_variant_service";
import type {
  AdminProductVariantsListApiResponse,
  AdminProductVariantsListApiResponseData,
  AdminVariantMutationApiResponse,
  AdminVariantMutationApiResponseData,
} from "@/domains/admin/products/types/api_params";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAuthorizedProductJsonResponse,
  createProductJsonResponse,
  isProductRouteError,
  mapProductRouteErrorStatus,
  parseJsonBody,
  resolveAdminRouteAccess,
} from "../../_shared";

const adminVariantUpdateRouteSchema = adminVariantUpsertSchema.and(
  z.object({
    variantId: z.string().trim().min(1).max(191),
  }),
);

interface ProductVariantRouteProps {
  params: Promise<{
    productId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: ProductVariantRouteProps,
): Promise<NextResponse<AdminProductVariantsListApiResponse>> {
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
    await resolveAdminRouteAccess<AdminProductVariantsListApiResponseData>(
      request,
    );

  if (!access.authorized) {
    return access.response;
  }

  try {
    const variants = await listAdminProductVariants({
      productId: paramsValidation.data.productId,
      includeTrash: true,
    });

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: variants,
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

export async function POST(
  request: NextRequest,
  { params }: ProductVariantRouteProps,
): Promise<NextResponse<AdminVariantMutationApiResponse>> {
  const jsonBody =
    await parseJsonBody<AdminVariantMutationApiResponseData>(request);

  if (!jsonBody.ok) {
    return jsonBody.response;
  }

  const payload = adminVariantUpsertSchema.safeParse(jsonBody.body);

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
    await resolveAdminRouteAccess<AdminVariantMutationApiResponseData>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const variant = await createAdminVariant(
      paramsValidation.data.productId,
      payload.data,
      undefined,
      access.actor,
    );

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: {
        variant,
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

export async function PATCH(
  request: NextRequest,
  { params }: ProductVariantRouteProps,
): Promise<NextResponse<AdminVariantMutationApiResponse>> {
  const jsonBody =
    await parseJsonBody<AdminVariantMutationApiResponseData>(request);

  if (!jsonBody.ok) {
    return jsonBody.response;
  }

  const payload = adminVariantUpdateRouteSchema.safeParse(jsonBody.body);

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
    await resolveAdminRouteAccess<AdminVariantMutationApiResponseData>(request);

  if (!access.authorized) {
    return access.response;
  }

  try {
    const { variantId, ...variantInput } = payload.data;
    const variant = await updateAdminVariant(
      paramsValidation.data.productId,
      variantId,
      variantInput,
    );

    return createAuthorizedProductJsonResponse(access.supabaseResponse, {
      data: {
        variant,
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
