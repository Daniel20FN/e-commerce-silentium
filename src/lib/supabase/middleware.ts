import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./shared";

const REFRESH_TOKEN_NOT_FOUND_CODE = "refresh_token_not_found";
const REFRESH_TOKEN_NOT_FOUND_MESSAGE = "refresh token not found";

function isRefreshTokenNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? error.message : undefined;

  return (
    code === REFRESH_TOKEN_NOT_FOUND_CODE ||
    (typeof message === "string" &&
      message.toLowerCase().includes(REFRESH_TOKEN_NOT_FOUND_MESSAGE))
  );
}

function createExpiredSessionResponse(request: NextRequest): NextResponse {
  const supabaseCookieNames = request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) => name.startsWith("sb-"));

  supabaseCookieNames.forEach((name) => {
    request.cookies.set(name, "");
  });

  const response = NextResponse.next({ request });

  supabaseCookieNames.forEach((name) => {
    response.cookies.set(name, "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    });
  });

  return response;
}

export async function updateSupabaseSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (isRefreshTokenNotFound(error)) {
      return {
        response: createExpiredSessionResponse(request),
        userId: null,
      };
    }

    return {
      response,
      userId: user?.id ?? null,
    };
  } catch (error) {
    if (isRefreshTokenNotFound(error)) {
      return {
        response: createExpiredSessionResponse(request),
        userId: null,
      };
    }

    throw error;
  }
}
