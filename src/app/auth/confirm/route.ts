import {
  AUTH_ROUTE_PREFIXES,
  sanitizeReturnTo,
} from "@/domains/auth/services/auth_routes";
import { confirmSchema } from "@/domains/auth/services/auth_schemas";
import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") ?? undefined;

  const safeReturnTo = sanitizeReturnTo(next);
  const loginUrl = new URL(AUTH_ROUTE_PREFIXES.login, request.url);
  loginUrl.searchParams.set("confirmed", "1");

  if (safeReturnTo) {
    loginUrl.searchParams.set("returnTo", safeReturnTo);
  }

  const response = NextResponse.redirect(loginUrl);
  response.headers.set("Cache-Control", "private, no-store");
  const supabase = createRouteHandlerSupabaseClient(request, response);

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL(AUTH_ROUTE_PREFIXES.authCodeError, request.url),
      );
    }

    await syncAuthUser({
      authUser: data.user,
    });

    return response;
  }

  const queryParams = confirmSchema.safeParse({
    token_hash: tokenHash,
    type,
    next,
  });

  if (!queryParams.success) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTE_PREFIXES.authCodeError, request.url),
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: queryParams.data.token_hash,
    type: queryParams.data.type,
  });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTE_PREFIXES.authCodeError, request.url),
    );
  }

  await syncAuthUser({
    authUser: data.user,
  });

  return response;
}
