/** @jest-environment node */

import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
}));

jest.mock("@/domains/auth/services/sync_auth_user", () => ({
  syncAuthUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockSyncAuthUser = jest.mocked(syncAuthUser);

function createSupabaseUser(overrides?: Partial<User>): User {
  return {
    id: "auth-user-1",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-02T00:00:00.000Z",
    email: "cliente@example.com",
    ...overrides,
  } as User;
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("supports the code exchange flow and redirects back to login", async () => {
    const authUser = createSupabaseUser();
    const exchangeCodeForSession = jest.fn().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    const verifyOtp = jest.fn();

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession,
        verifyOtp,
      },
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/auth/confirm?code=abc123&next=%2Fcheckout%2Fshipping",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(mockSyncAuthUser).toHaveBeenCalledWith({ authUser });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?confirmed=1&returnTo=%2Fcheckout%2Fshipping",
    );
  });

  it("supports the token_hash verification flow", async () => {
    const authUser = createSupabaseUser();
    const exchangeCodeForSession = jest.fn();
    const verifyOtp = jest.fn().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession,
        verifyOtp,
      },
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/auth/confirm?token_hash=otp123&type=signup&next=%2Faccount",
      ),
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "otp123",
      type: "signup",
    });
    expect(mockSyncAuthUser).toHaveBeenCalledWith({ authUser });
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?confirmed=1&returnTo=%2Faccount",
    );
  });

  it("redirects invalid confirmation requests to the auth code error page", async () => {
    const exchangeCodeForSession = jest.fn();
    const verifyOtp = jest.fn();

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        exchangeCodeForSession,
        verifyOtp,
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/auth/confirm?next=%2Fcheckout"),
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(mockSyncAuthUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost/auth/auth-code-error",
    );
  });
});
