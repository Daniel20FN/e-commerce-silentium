/** @jest-environment node */

import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: jest.fn(
    <T>(source: NextResponse, target: NextResponse<T>): NextResponse<T> => {
      source.cookies.getAll().forEach((cookie) => {
        target.cookies.set(cookie.name, cookie.value, cookie);
      });

      return target;
    },
  ),
}));

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the current sanitized user when a session resolves", async () => {
    const supabase = {
      auth: {},
    };
    const currentUser: CurrentUserDto = {
      id: "user-1",
      authUserId: "auth-user-1",
      email: "cliente@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ana",
        lastName: "Pérez",
      },
    };

    mockCreateRouteHandlerSupabaseClient.mockReturnValue(supabase);
    mockResolveCurrentUser.mockResolvedValue(currentUser);

    const response = await GET(new NextRequest("http://localhost/api/auth/me"));

    expect(mockResolveCurrentUser).toHaveBeenCalledWith(supabase);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        user: currentUser,
      },
    });
  });

  it("returns an explicit auth error when current user resolution fails", async () => {
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} });
    mockResolveCurrentUser.mockRejectedValue(new Error("boom"));

    const response = await GET(new NextRequest("http://localhost/api/auth/me"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      type: "internal_server_error",
      message: "unexpected_auth_error",
    });
  });

  it("clears stale Supabase cookies and returns 401 when the refresh token no longer exists", async () => {
    mockCreateRouteHandlerSupabaseClient.mockImplementation(
      (_request, response: NextResponse<unknown>) => {
        response.cookies.set("sb-project-auth-token", "stale-token");
        return { auth: {} } as never;
      },
    );
    mockResolveCurrentUser.mockRejectedValue(
      Object.assign(
        new Error("Invalid Refresh Token: Refresh Token Not Found"),
        { code: "refresh_token_not_found" },
      ),
    );
    const request = new NextRequest("http://localhost/api/auth/me", {
      headers: {
        cookie: "sb-project-auth-token=stale-token; unrelated-cookie=keep-me",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "session_expired",
    });
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("");
    expect(response.cookies.get("unrelated-cookie")).toBeUndefined();
  });

  it("recognizes a missing refresh token when only the Supabase error message survives", async () => {
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} });
    mockResolveCurrentUser.mockRejectedValue(
      new Error("Invalid Refresh Token: Refresh Token Not Found"),
    );

    const response = await GET(new NextRequest("http://localhost/api/auth/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "session_expired",
    });
  });

  it("returns 401 when no Supabase auth session exists", async () => {
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} });
    mockResolveCurrentUser.mockRejectedValue(
      Object.assign(new Error("Auth session missing!"), {
        name: "AuthSessionMissingError",
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api/auth/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "session_expired",
    });
  });
});
