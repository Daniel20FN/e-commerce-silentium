import {
  buildAuthenticatedRedirect,
  buildLoginRedirect,
  isAuthEntryRoute,
  isProtectedApiRoute,
  isProtectedAppRoute,
} from "@/domains/auth/services/auth_routes";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });

  for (const name of ["Cache-Control", "X-Robots-Tag"]) {
    const value = source.headers.get(name);
    if (value) target.headers.set(name, value);
  }

  return target;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { response, userId } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/")
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  const returnTo = `${pathname}${request.nextUrl.search}`;

  if (!userId && isProtectedApiRoute(pathname)) {
    return copyCookies(
      response,
      NextResponse.json(
        {
          type: "unauthorized",
          message: "unauthorized",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      ),
    );
  }

  if (!userId && isProtectedAppRoute(pathname)) {
    return copyCookies(
      response,
      NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url)),
    );
  }

  if (userId && isAuthEntryRoute(pathname)) {
    return copyCookies(
      response,
      NextResponse.redirect(
        new URL(
          buildAuthenticatedRedirect(
            request.nextUrl.searchParams.get("returnTo"),
          ),
          request.url,
        ),
      ),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
