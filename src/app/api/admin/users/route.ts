import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { listAdminUsers } from "@/domains/admin/users/services/admin_user_queries";
import { adminUsersListParamsSchema } from "@/domains/admin/users/services/admin_user_schemas";
import type { AdminUsersListApiResponse } from "@/domains/admin/users/types/api_responses";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: AdminUsersListApiResponse,
  status = 200,
): NextResponse<AdminUsersListApiResponse> {
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
): Promise<NextResponse<AdminUsersListApiResponse>> {
  const payload = adminUsersListParamsSchema.safeParse(
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

    const data = await listAdminUsers(payload.data);

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
