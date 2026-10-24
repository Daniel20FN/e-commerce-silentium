import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";
import { AccountError } from "./account_errors";

export type AccountSessionClient = ReturnType<
  typeof createRouteHandlerSupabaseClient
>;
export async function accountRoute<T>(
  request: NextRequest,
  action: (user: CurrentUserDto, client: AccountSessionClient) => Promise<T>,
): Promise<NextResponse<ApiResponse<T>>> {
  const cookies = NextResponse.json(null);
  let body: ApiResponse<T>;
  let status = 200;
  try {
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !== request.nextUrl.origin ||
        !request.headers.get("content-type")?.startsWith("application/json"))
    )
      throw new AccountError("forbidden", 403);
    const client = createRouteHandlerSupabaseClient(request, cookies);
    const user = await resolveCurrentUser(client);
    if (!user || !user.emailVerified)
      throw new AccountError("unauthorized", 401);
    body = { data: await action(user, client) };
  } catch (error) {
    if (!(error instanceof AccountError))
      console.error("account_operation_failed", { method: request.method });
    status = error instanceof AccountError ? error.status : 503;
    body = {
      type:
        status === 401
          ? "unauthorized"
          : status === 403
            ? "forbidden"
            : status === 409
              ? "conflict"
              : status === 400
                ? "validation_error"
                : "service_unavailable",
      message:
        error instanceof AccountError ? error.code : "account_unavailable",
    };
  }
  return copySupabaseResponseCookies(
    cookies,
    NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }),
  );
}
