import { registerSchema } from "@/domains/auth/services/auth_schemas";
import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import type { RegisterApiResponse } from "@/domains/auth/types/api_responses";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: RegisterApiResponse,
  status = 200,
): NextResponse<RegisterApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RegisterApiResponse>> {
  const payload = registerSchema.safeParse(await request.json());

  if (!payload.success) {
    return createJsonResponse(
      {
        type: "validation_error",
        message: payload.error.issues[0]?.message ?? "validation_error",
      },
      400,
    );
  }

  const response = createJsonResponse({
    data: {
      requiresEmailConfirmation: true,
      email: payload.data.email.trim().toLowerCase(),
    },
  });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const emailRedirectTo = new URL("/auth/confirm", request.url).toString();

  const { data, error } = await supabase.auth.signUp({
    email: payload.data.email.trim().toLowerCase(),
    password: payload.data.password,
    options: {
      emailRedirectTo,
      data: {
        first_name: payload.data.firstName,
        last_name: payload.data.lastName,
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "email_already_registered"
      : "unexpected_auth_error";

    return createJsonResponse(
      {
        type: error.message.toLowerCase().includes("already")
          ? "conflict"
          : "internal_server_error",
        message,
      },
      error.message.toLowerCase().includes("already") ? 409 : 500,
    );
  }

  if (!data.user) {
    return createJsonResponse(
      {
        type: "internal_server_error",
        message: "unexpected_auth_error",
      },
      500,
    );
  }

  if (data.session || data.user.email_confirmed_at) {
    await supabase.auth.signOut();

    return createJsonResponse(
      {
        type: "internal_server_error",
        message: "email_confirmation_misconfigured",
      },
      500,
    );
  }

  await syncAuthUser({
    authUser: data.user,
    profile: {
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
    },
    acceptedTermsAt: new Date(),
  });

  return response;
}
