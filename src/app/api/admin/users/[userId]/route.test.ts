/** @jest-environment node */

import { updateAdminUser } from "@/domains/admin/users/services/admin_user_mutations";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "./route";

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

jest.mock("@/domains/admin/users/services/admin_user_mutations", () => ({
  updateAdminUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockUpdateAdminUser = jest.mocked(updateAdminUser);

describe("PATCH /api/admin/users/[userId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} });
  });

  it("updates the requested user for admins", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      id: "admin-1",
      authUserId: "auth-admin-1",
      email: "admin@example.com",
      role: UserRole.super_admin,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ada",
        lastName: "Admin",
      },
    });
    mockUpdateAdminUser.mockResolvedValue({
      id: "user-1",
      authUserId: "auth-user-1",
      fullName: "Ana Pérez",
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: UserRole.admin,
      status: UserStatus.blocked,
      phone: null,
      createdAt: "2026-04-17T10:00:00.000Z",
      lastAccessAt: null,
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/users/user-1", {
        method: "PATCH",
        body: JSON.stringify({
          role: UserRole.admin,
          status: UserStatus.blocked,
        }),
      }),
      {
        params: Promise.resolve({ userId: "user-1" }),
      },
    );

    expect(mockUpdateAdminUser).toHaveBeenCalledWith("user-1", {
      role: UserRole.admin,
      status: UserStatus.blocked,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        user: {
          id: "user-1",
          authUserId: "auth-user-1",
          fullName: "Ana Pérez",
          firstName: "Ana",
          lastName: "Pérez",
          email: "ana@example.com",
          role: UserRole.admin,
          status: UserStatus.blocked,
          phone: null,
          createdAt: "2026-04-17T10:00:00.000Z",
          lastAccessAt: null,
        },
      },
    });
  });

  it("validates that at least one mutable field is present", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/users/user-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({ userId: "user-1" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "admin_user_update_required",
    });
  });
});
