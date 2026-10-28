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
  if (
    request.headers.get("origin") !== request.nextUrl.origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return createJsonResponse({ type: "forbidden", message: "forbidden" }, 403);
  const payload = registerSchema.safeParse(
    await request.json().catch(() => null),
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

  if (data.user?.identities?.length === 0) return response;

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

  try {
    await syncAuthUser({
      authUser: data.user,
      profile: {
        firstName: payload.data.firstName,
        lastName: payload.data.lastName,
      },
      legalAcceptance: {
        acceptTerms: payload.data.acceptTerms,
        acceptPrivacy: payload.data.acceptPrivacy,
        adult: payload.data.adult,
        legalVersion: payload.data.legalVersion,
      },
      acceptsMarketingEmails: payload.data.acceptsMarketingEmails,
      acceptsWhatsAppMarketing: payload.data.acceptsWhatsAppMarketing,
    });
  } catch (error) {
    console.error("registration_legal_persistence_failed");
    return createJsonResponse(
      {
        type: "service_unavailable",
        message:
          error instanceof Error && error.message === "legal_version_changed"
            ? "legal_version_changed"
            : "registration_unavailable",
      },
      503,
    );
  }
  return response;
}
