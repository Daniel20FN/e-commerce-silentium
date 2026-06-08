/** @jest-environment node */

import { trashAdminCategory } from "@/domains/admin/categories/services/admin_category_mutations";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
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

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));

jest.mock(
  "@/domains/admin/categories/services/admin_category_mutations",
  () => ({
    trashAdminCategory: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockTrashAdminCategory = jest.mocked(trashAdminCategory);

describe("POST /api/admin/categories/[categoryId]/trash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
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
  });

  it("trashes category and returns mutation payload", async () => {
    mockTrashAdminCategory.mockResolvedValue({
      id: "cat-1",
      name: "Ropa de cama",
      slug: "ropa-de-cama",
      description: null,
      imageUrl: null,
      parentId: null,
      parentName: null,
      isActive: true,
      inTrash: true,
      sortOrder: 10,
      seoTitle: null,
      seoDescription: null,
      productsCount: null,
      createdAt: "2026-04-18T10:00:00.000Z",
      updatedAt: "2026-04-18T10:00:00.000Z",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/trash", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(200);
  });

  it("returns 422 when category has active children", async () => {
    mockTrashAdminCategory.mockRejectedValue({
      type: "invalid_state",
      message: "category_has_active_children",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/trash", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      type: "invalid_state",
      message: "category_has_active_children",
    });
  });

  it("returns 401 for unauthenticated user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/trash", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when user role has no admin access", async () => {
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

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/trash", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(403);
  });
});
