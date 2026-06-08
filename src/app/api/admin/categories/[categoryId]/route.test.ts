/** @jest-environment node */

import { updateAdminCategory } from "@/domains/admin/categories/services/admin_category_mutations";
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

jest.mock(
  "@/domains/admin/categories/services/admin_category_mutations",
  () => ({
    updateAdminCategory: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockUpdateAdminCategory = jest.mocked(updateAdminCategory);

describe("PATCH /api/admin/categories/[categoryId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
  });

  it("updates category payload for admin role", async () => {
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
    mockUpdateAdminCategory.mockResolvedValue({
      id: "cat-1",
      name: "Ropa de cama",
      slug: "ropa-de-cama",
      description: null,
      imageUrl: null,
      parentId: null,
      parentName: null,
      isActive: true,
      inTrash: false,
      sortOrder: 10,
      seoTitle: null,
      seoDescription: null,
      productsCount: null,
      createdAt: "2026-04-18T10:00:00.000Z",
      updatedAt: "2026-04-18T10:00:00.000Z",
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/categories/cat-1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Ropa de cama",
          slug: "ropa-de-cama",
          sortOrder: 10,
          isActive: true,
        }),
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(mockUpdateAdminCategory).toHaveBeenCalledWith(
      "cat-1",
      expect.objectContaining({
        name: "Ropa de cama",
        slug: "ropa-de-cama",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 400 when payload is empty", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/categories/cat-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "admin_category_update_required",
    });
  });
});
