/** @jest-environment node */

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "./middleware";

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
