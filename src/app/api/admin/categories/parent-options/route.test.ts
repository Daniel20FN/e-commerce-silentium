/** @jest-environment node */

import { listAdminCategoryParentOptions } from "@/domains/admin/categories/services/admin_category_queries";
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

jest.mock("@/domains/admin/categories/services/admin_category_queries", () => ({
  listAdminCategoryParentOptions: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockListAdminCategoryParentOptions = jest.mocked(
  listAdminCategoryParentOptions,
);

describe("GET /api/admin/categories/parent-options", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
  });

  it("returns active parent options for admin users", async () => {
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
    mockListAdminCategoryParentOptions.mockResolvedValue({
      items: [
        {
          id: "cat-parent-1",
          name: "Dormitorio",
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/categories/parent-options"),
    );

    expect(mockListAdminCategoryParentOptions).toHaveBeenCalledWith();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        items: [
          {
            id: "cat-parent-1",
            name: "Dormitorio",
          },
        ],
      },
    });
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/categories/parent-options"),
    );

    expect(response.status).toBe(401);
    expect(mockListAdminCategoryParentOptions).not.toHaveBeenCalled();
  });

  it("returns 403 when user has no admin access", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      id: "support-1",
      authUserId: "auth-support-1",
      email: "support@example.com",
      role: UserRole.support,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Support",
        lastName: "User",
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/categories/parent-options"),
    );

    expect(response.status).toBe(403);
    expect(mockListAdminCategoryParentOptions).not.toHaveBeenCalled();
  });
});
