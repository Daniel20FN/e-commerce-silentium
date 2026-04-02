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
});
