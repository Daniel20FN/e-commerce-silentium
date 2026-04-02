import { buildAuthenticatedRedirect } from "@/domains/auth/services/auth_routes";
import { loginSchema } from "@/domains/auth/services/auth_schemas";
import { sanitizeCurrentUser } from "@/domains/auth/services/sanitize_current_user";
import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import type { LoginApiResponse } from "@/domains/auth/types/api_responses";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: LoginApiResponse,
  status = 200,
): NextResponse<LoginApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginApiResponse>> {
  const payload = loginSchema.safeParse(await request.json());

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.data.email.trim().toLowerCase(),
    password: payload.data.password,
  });

  if (error || !data.user) {
    const errorMessage = error?.message.toLowerCase() ?? "";

    return createJsonResponse(
      {
        type: "unauthorized",
        message: errorMessage.includes("confirm")
          ? "email_confirmation_required"
          : "invalid_credentials",
      },
      401,
    );
  }

  const businessUser = await syncAuthUser({
    authUser: data.user,
  });
  const user = sanitizeCurrentUser(businessUser);

  return copySupabaseResponseCookies(
    supabaseResponse,
    createJsonResponse({
      data: {
        user,
        redirectTo: buildAuthenticatedRedirect(payload.data.returnTo),
      },
    }),
  );
}
