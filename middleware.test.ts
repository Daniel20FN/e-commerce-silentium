/** @jest-environment node */

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";
import { config, middleware } from "./middleware";

jest.mock("@/lib/supabase/middleware", () => ({
  updateSupabaseSession: jest.fn(),
}));

const mockUpdateSupabaseSession = jest.mocked(updateSupabaseSession);

function createSessionResponse(): NextResponse {
  const response = NextResponse.next();
  response.cookies.set("sb-access-token", "cookie-value");
  return response;
}

describe("auth middleware", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    "/login",
    "/register",
    "/carrito",
    "/account",
    "/api/account",
    "/auth/confirm",
    "/admin",
  ])("keeps %s noindex, including anonymous redirects", async (path) => {
    jest.replaceProperty(process, "env", {
      ...process.env,
      VERCEL_ENV: "production",
    });
    mockUpdateSupabaseSession.mockResolvedValue({
      response: createSessionResponse(),
      userId: null,
    });
    const response = await middleware(
      new NextRequest(`https://www.silentium-hogar.com${path}`),
    );
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("does not noindex production public pages but excludes previews", async () => {
    jest.replaceProperty(process, "env", {
      ...process.env,
      VERCEL_ENV: "production",
    });
    mockUpdateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: null,
    });
    expect(
      (
        await middleware(
          new NextRequest("https://www.silentium-hogar.com/productos"),
        )
      ).headers.has("X-Robots-Tag"),
    ).toBe(false);
    process.env.VERCEL_ENV = "preview";
    mockUpdateSupabaseSession.mockResolvedValue({
      response: NextResponse.next(),
      userId: null,
    });
    expect(
      (
        await middleware(new NextRequest("https://preview.example/productos"))
      ).headers.get("X-Robots-Tag"),
    ).toContain("noindex");
  });

  it("excludes only exact metadata paths from session middleware", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test("/sitemap.xml")).toBe(false);
    expect(matcher.test("/robots.txt")).toBe(false);
    expect(matcher.test("/productos/sitemap.xml-example")).toBe(true);
    expect(matcher.test("/api/account")).toBe(true);
  });
  it.each([
    "/admin/productos/qa/preview",
    "/admin/productos/qa/preview/content",
    "/api/admin/products/qa/publication",
  ])("never caches or indexes private catalog route %s", async (path) => {
    mockUpdateSupabaseSession.mockResolvedValue({
      response: createSessionResponse(),
      userId: "admin",
    });
    const response = await middleware(
      new NextRequest(`http://localhost${path}`),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 for anonymous protected API requests", async () => {
    mockUpdateSupabaseSession.mockResolvedValue({
      response: createSessionResponse(),
      userId: null,
    });

    const response = await middleware(
      new NextRequest("http://localhost/api/account/profile"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "unauthorized",
    });
    expect(response.cookies.get("sb-access-token")?.value).toBe("cookie-value");
  });

  it("redirects anonymous protected app requests to login with returnTo", async () => {
    mockUpdateSupabaseSession.mockResolvedValue({
      response: createSessionResponse(),
      userId: null,
    });

    const response = await middleware(
      new NextRequest("http://localhost/checkout/shipping?step=address"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?returnTo=%2Fcheckout%2Fshipping%3Fstep%3Daddress",
    );
  });

  it("redirects authenticated users away from auth entry routes", async () => {
    mockUpdateSupabaseSession.mockResolvedValue({
      response: createSessionResponse(),
      userId: "auth-user-1",
    });

    const response = await middleware(
      new NextRequest("http://localhost/login?returnTo=%2Faccount"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/account");
  });
});
