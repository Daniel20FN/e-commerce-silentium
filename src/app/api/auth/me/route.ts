import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserApiResponse } from "@/domains/auth/types/api_responses";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: CurrentUserApiResponse,
  status = 200,
): NextResponse<CurrentUserApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CurrentUserApiResponse>> {
  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  try {
    const user = await resolveCurrentUser(supabase);

    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse({
        data: {
          user,
        },
      }),
    );
  } catch {
    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse(
        {
          type: "internal_server_error",
          message: "unexpected_auth_error",
        },
        500,
      ),
    );
  }
}
