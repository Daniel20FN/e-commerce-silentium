import {
  createAdminCategory,
  type AdminCategoryMutationError,
} from "@/domains/admin/categories/services/admin_category_mutations";
import { listAdminCategories } from "@/domains/admin/categories/services/admin_category_queries";
import {
  adminCategoriesListParamsSchema,
  adminCategoryCreateSchema,
} from "@/domains/admin/categories/services/admin_category_schemas";
import type {
  AdminCategoriesListApiResponse,
  AdminCategoryMutationApiResponse,
} from "@/domains/admin/categories/types/api_responses";
import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  createCategoryJsonResponse,
  isCategoryMutationError,
  mapCategoryMutationErrorStatus,
} from "./_shared";

function createJsonResponse(
  body: AdminCategoriesListApiResponse,
  status = 200,
): NextResponse<AdminCategoriesListApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function parseRequestParams(request: NextRequest): unknown {
  const rawParams = request.nextUrl.searchParams.get("params");

  if (!rawParams) {
    return {};
  }

  try {
    return JSON.parse(rawParams) as unknown;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AdminCategoriesListApiResponse>> {
  const payload = adminCategoriesListParamsSchema.safeParse(
    parseRequestParams(request),
  );

  if (!payload.success) {
    return createJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  try {
    const currentUser = await resolveCurrentUser(supabase);

    if (!currentUser) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "unauthorized",
            message: "unauthorized",
          },
          401,
        ),
      );
    }

    if (!canAccessAdmin(currentUser)) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "forbidden",
            message: "forbidden",
          },
          403,
        ),
      );
    }

    const data = await listAdminCategories(payload.data);

    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse({
        data,
      }),
    );
  } catch {
    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse(
        {
          type: "internal_server_error",
          message: "internal_server_error",
        },
        500,
      ),
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AdminCategoryMutationApiResponse>> {
  const payload = adminCategoryCreateSchema.safeParse(await request.json());

  if (!payload.success) {
    return createCategoryJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  try {
    const currentUser = await resolveCurrentUser(supabase);

    if (!currentUser) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createCategoryJsonResponse(
          {
            type: "unauthorized",
            message: "unauthorized",
          },
          401,
        ),
      );
    }

    if (!canAccessAdmin(currentUser)) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createCategoryJsonResponse(
          {
            type: "forbidden",
            message: "forbidden",
          },
          403,
        ),
      );
    }

    const category = await createAdminCategory(payload.data);

    return copySupabaseResponseCookies(
      supabaseResponse,
      createCategoryJsonResponse({
        data: {
          category,
        },
      }),
    );
  } catch (error) {
    if (isCategoryMutationError(error)) {
      const mutationError = error as AdminCategoryMutationError;

      return copySupabaseResponseCookies(
        supabaseResponse,
        createCategoryJsonResponse(
          {
            type: mutationError.type,
            message: mutationError.message,
          },
          mapCategoryMutationErrorStatus(mutationError.type),
        ),
      );
    }

    return copySupabaseResponseCookies(
      supabaseResponse,
      createCategoryJsonResponse(
        {
          type: "internal_server_error",
          message: "internal_server_error",
        },
        500,
      ),
    );
  }
}
