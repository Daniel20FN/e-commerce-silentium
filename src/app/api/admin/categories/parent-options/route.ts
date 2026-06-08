import { listAdminCategoryParentOptions } from "@/domains/admin/categories/services/admin_category_queries";
import type { AdminCategoryParentOptionsApiResponse } from "@/domains/admin/categories/types/api_responses";
import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: AdminCategoryParentOptionsApiResponse,
  status = 200,
): NextResponse<AdminCategoryParentOptionsApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AdminCategoryParentOptionsApiResponse>> {
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

    const data = await listAdminCategoryParentOptions();

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
