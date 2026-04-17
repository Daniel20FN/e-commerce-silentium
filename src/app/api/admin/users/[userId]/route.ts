import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { updateAdminUser } from "@/domains/admin/users/services/admin_user_mutations";
import { adminUserUpdateSchema } from "@/domains/admin/users/services/admin_user_schemas";
import type { AdminUserMutationApiResponse } from "@/domains/admin/users/types/api_responses";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: AdminUserMutationApiResponse,
  status = 200,
): NextResponse<AdminUserMutationApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

interface AdminUserMutationRouteProps {
  params: Promise<{
    userId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: AdminUserMutationRouteProps,
): Promise<NextResponse<AdminUserMutationApiResponse>> {
  const payload = adminUserUpdateSchema.safeParse(await request.json());

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

    const { userId } = await params;
    const user = await updateAdminUser(userId, payload.data);

    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse({
        data: {
          user,
        },
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "not_found",
            message: "record_not_found",
          },
          404,
        ),
      );
    }

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
