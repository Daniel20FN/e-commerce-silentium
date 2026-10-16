import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserApiResponse } from "@/domains/auth/types/api_responses";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const REFRESH_TOKEN_NOT_FOUND_CODE = "refresh_token_not_found";
const REFRESH_TOKEN_NOT_FOUND_MESSAGE = "refresh token not found";
const AUTH_SESSION_MISSING_NAME = "AuthSessionMissingError";
const AUTH_SESSION_MISSING_MESSAGE = "auth session missing";

function createJsonResponse(
  body: CurrentUserApiResponse,
  status = 200,
): NextResponse<CurrentUserApiResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function isUnauthorizedSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? error.code : undefined;

  return (
    code === REFRESH_TOKEN_NOT_FOUND_CODE ||
    error.name === AUTH_SESSION_MISSING_NAME ||
    error.message.toLowerCase().includes(REFRESH_TOKEN_NOT_FOUND_MESSAGE) ||
    error.message.toLowerCase().includes(AUTH_SESSION_MISSING_MESSAGE)
  );
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse<CurrentUserApiResponse>,
): void {
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("sb-"))
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CurrentUserApiResponse>> {
  const supabaseResponse = NextResponse.json(null);
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  try {
    const user = await resolveCurrentUser(supabase);

    if (!user) {
      const response = copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          { type: "unauthorized", message: "session_expired" },
          401,
        ),
      );
      clearSupabaseAuthCookies(request, response);
      return response;
    }

    return copySupabaseResponseCookies(
      supabaseResponse,
      createJsonResponse({
        data: {
          user,
        },
      }),
    );
  } catch (error) {
    if (isUnauthorizedSessionError(error)) {
      const response = copySupabaseResponseCookies(
        supabaseResponse,
        createJsonResponse(
          {
            type: "unauthorized",
            message: "session_expired",
          },
          401,
        ),
      );

      clearSupabaseAuthCookies(request, response);

      return response;
    }

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
