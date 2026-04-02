import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeReturnTo,
} from "@/domains/auth/services/auth_routes";
import { logoutSchema } from "@/domains/auth/services/auth_schemas";
import type { LogoutApiResponse } from "@/domains/auth/types/api_responses";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: LogoutApiResponse,
  status = 200,
): NextResponse<LogoutApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LogoutApiResponse>> {
  const payload = logoutSchema.safeParse(
    await request.json().catch(() => ({})),
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

  const redirectTo =
    sanitizeReturnTo(payload.data.redirectTo) ?? DEFAULT_AUTH_REDIRECT;
  const response = createJsonResponse({
    data: {
      success: true,
      redirectTo,
    },
  });
  const supabase = createRouteHandlerSupabaseClient(request, response);

  await supabase.auth.signOut();

  return response;
}
