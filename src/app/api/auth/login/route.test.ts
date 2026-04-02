/** @jest-environment node */

import type { AuthUserRecord } from "@/domains/auth/services/sanitize_current_user";
import { sanitizeCurrentUser } from "@/domains/auth/services/sanitize_current_user";
import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

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

jest.mock("@/domains/auth/services/sync_auth_user", () => ({
  syncAuthUser: jest.fn(),
}));

jest.mock("@/domains/auth/services/sanitize_current_user", () => ({
  sanitizeCurrentUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockCopySupabaseResponseCookies = jest.mocked(
  copySupabaseResponseCookies,
);
const mockSyncAuthUser = jest.mocked(syncAuthUser);
const mockSanitizeCurrentUser = jest.mocked(sanitizeCurrentUser);

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

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the sanitized user after a confirmed login", async () => {
    const authUser = createSupabaseUser();
    const businessUser: AuthUserRecord = {
      id: "user-1",
      supabaseAuthUserId: "auth-user-1",
      email: "cliente@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerifiedAt: new Date("2026-04-02T00:00:00.000Z"),
      phoneVerifiedAt: null,
      lastLoginAt: new Date("2026-04-02T00:00:00.000Z"),
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      profile: {
        userId: "user-1",
        firstName: "Ana",
        lastName: "Pérez",
        phone: null,
        documentType: null,
        documentNumber: null,
        birthDate: null,
        gender: null,
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      },
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
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signInWithPassword,
      },
    });
    mockSyncAuthUser.mockResolvedValue(businessUser);
    mockSanitizeCurrentUser.mockReturnValue(currentUser);

    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "CLIENTE@example.com",
        password: "password123",
        returnTo: "/account/orders",
      }),
    });

    const response = await POST(request);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "cliente@example.com",
      password: "password123",
    });
    expect(mockSyncAuthUser).toHaveBeenCalledWith({ authUser });
    expect(mockSanitizeCurrentUser).toHaveBeenCalledWith(businessUser);
    expect(mockCopySupabaseResponseCookies).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        user: currentUser,
        redirectTo: "/account/orders",
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("classifies unconfirmed accounts as email confirmation required", async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: { user: null },
      error: {
        message: "Email not confirmed",
      },
    });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signInWithPassword,
      },
    });

    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "cliente@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "email_confirmation_required",
    });
    expect(mockSyncAuthUser).not.toHaveBeenCalled();
  });
});
