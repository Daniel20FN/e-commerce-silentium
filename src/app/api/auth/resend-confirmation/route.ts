import { resendConfirmationSchema } from "@/domains/auth/services/auth_schemas";
import {
  AUTH_RESEND_COOLDOWN,
  AUTH_RESEND_ERROR,
  mapResendConfirmationError,
} from "@/domains/auth/services/resend_confirmation";
import type { ResendConfirmationApiResponse } from "@/domains/auth/types/api_responses";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function createJsonResponse(
  body: ResendConfirmationApiResponse,
  status = 200,
): NextResponse<ResendConfirmationApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ResendConfirmationApiResponse>> {
  const payload = resendConfirmationSchema.safeParse(await request.json());

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
      email: payload.data.email.trim().toLowerCase(),
      cooldownSeconds: AUTH_RESEND_COOLDOWN.seconds,
    },
  });
  const supabase = createRouteHandlerSupabaseClient(request, response);
  const emailRedirectTo = new URL("/auth/confirm", request.url).toString();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: payload.data.email.trim().toLowerCase(),
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    const message = mapResendConfirmationError(error);

    return createJsonResponse(
      {
        type:
          message === AUTH_RESEND_ERROR.rateLimited
            ? "timeout"
            : message === AUTH_RESEND_ERROR.unexpected
              ? "internal_server_error"
              : "bad_request",
        message,
      },
      message === AUTH_RESEND_ERROR.rateLimited
        ? 429
        : message === AUTH_RESEND_ERROR.unexpected
          ? 500
          : 400,
    );
  }

  return response;
}
