/** @jest-environment node */

import { listAdminUsers } from "@/domains/admin/users/services/admin_user_queries";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
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

jest.mock("@/domains/admin/users/services/admin_user_queries", () => ({
  listAdminUsers: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockListAdminUsers = jest.mocked(listAdminUsers);

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} });
  });

  it("returns a paginated list for admin users", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      id: "admin-1",
      authUserId: "auth-admin-1",
      email: "admin@example.com",
      role: UserRole.admin,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ada",
        lastName: "Admin",
      },
    });
    mockListAdminUsers.mockResolvedValue({
      users: [
        {
          id: "user-1",
          authUserId: "auth-user-1",
          fullName: "Ana Pérez",
          firstName: "Ana",
          lastName: "Pérez",
          email: "ana@example.com",
          role: UserRole.customer,
          status: UserStatus.active,
          phone: "3000000000",
          createdAt: "2026-04-17T10:00:00.000Z",
          lastAccessAt: "2026-04-17T11:00:00.000Z",
        },
      ],
      total: 1,
      page: 0,
      pageSize: 10,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/users?params=%7B%22page%22%3A0%2C%22pageSize%22%3A10%7D",
      ),
    );

    expect(mockListAdminUsers).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      search: "",
      sortField: "createdAt",
      sortDirection: "desc",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        users: [
          {
            id: "user-1",
            authUserId: "auth-user-1",
            fullName: "Ana Pérez",
            firstName: "Ana",
            lastName: "Pérez",
            email: "ana@example.com",
            role: UserRole.customer,
            status: UserStatus.active,
            phone: "3000000000",
            createdAt: "2026-04-17T10:00:00.000Z",
            lastAccessAt: "2026-04-17T11:00:00.000Z",
          },
        ],
        total: 1,
        page: 0,
        pageSize: 10,
      },
    });
  });

  it("rejects non admin users", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      id: "customer-1",
      authUserId: "auth-customer-1",
      email: "customer@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ana",
        lastName: "Cliente",
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/users"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      type: "forbidden",
      message: "forbidden",
    });
  });
});
