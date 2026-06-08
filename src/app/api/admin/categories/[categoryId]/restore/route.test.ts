/** @jest-environment node */

import { restoreAdminCategory } from "@/domains/admin/categories/services/admin_category_mutations";
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
    restoreAdminCategory: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockRestoreAdminCategory = jest.mocked(restoreAdminCategory);

describe("POST /api/admin/categories/[categoryId]/restore", () => {
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

  it("restores category and forwards warnings", async () => {
    mockRestoreAdminCategory.mockResolvedValue({
      category: {
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
      },
      restoreWarnings: ["parent_unavailable_restored_as_root"],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/restore", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        category: {
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
        },
        restoreWarnings: ["parent_unavailable_restored_as_root"],
      },
    });
  });

  it("restores category preserving parent without warnings", async () => {
    mockRestoreAdminCategory.mockResolvedValue({
      category: {
        id: "cat-2",
        name: "Sábanas",
        slug: "sabanas",
        description: null,
        imageUrl: null,
        parentId: "cat-parent",
        parentName: "Dormitorio",
        isActive: true,
        inTrash: false,
        sortOrder: 20,
        seoTitle: null,
        seoDescription: null,
        productsCount: null,
        createdAt: "2026-04-18T10:00:00.000Z",
        updatedAt: "2026-04-18T10:00:00.000Z",
      },
      restoreWarnings: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-2/restore", {
        method: "POST",
      }),
      {
        params: Promise.resolve({
          categoryId: "cat-2",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        category: {
          id: "cat-2",
          name: "Sábanas",
          slug: "sabanas",
          description: null,
          imageUrl: null,
          parentId: "cat-parent",
          parentName: "Dormitorio",
          isActive: true,
          inTrash: false,
          sortOrder: 20,
          seoTitle: null,
          seoDescription: null,
          productsCount: null,
          createdAt: "2026-04-18T10:00:00.000Z",
          updatedAt: "2026-04-18T10:00:00.000Z",
        },
        restoreWarnings: [],
      },
    });
  });

  it("returns 401 for unauthenticated user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/cat-1/restore", {
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
});
