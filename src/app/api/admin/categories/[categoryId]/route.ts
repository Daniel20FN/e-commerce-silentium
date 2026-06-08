import {
  updateAdminCategory,
  type AdminCategoryMutationError,
} from "@/domains/admin/categories/services/admin_category_mutations";
import {
  adminCategoryTrashSchema,
  adminCategoryUpdateSchema,
} from "@/domains/admin/categories/services/admin_category_schemas";
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
} from "../_shared";

interface CategoryRouteProps {
  params: Promise<{
    categoryId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: CategoryRouteProps,
) {
  const payload = adminCategoryUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return createCategoryJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const { categoryId } = await params;
  const paramsValidation = adminCategoryTrashSchema.safeParse({ categoryId });

  if (!paramsValidation.success) {
    return createCategoryJsonResponse(
      {
        type: "validation_error",
        message:
          paramsValidation.error.issues[0]?.message ?? "validation_error",
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

    const category = await updateAdminCategory(categoryId, payload.data);

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
