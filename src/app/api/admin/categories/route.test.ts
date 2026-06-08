/** @jest-environment node */

import { createAdminCategory } from "@/domains/admin/categories/services/admin_category_mutations";
import { listAdminCategories } from "@/domains/admin/categories/services/admin_category_queries";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";

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
  listAdminCategories: jest.fn(),
}));

jest.mock(
  "@/domains/admin/categories/services/admin_category_mutations",
  () => ({
    createAdminCategory: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockListAdminCategories = jest.mocked(listAdminCategories);
const mockCreateAdminCategory = jest.mocked(createAdminCategory);

describe("GET /api/admin/categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
  });

  it("returns paginated categories for admin users", async () => {
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
    mockListAdminCategories.mockResolvedValue({
      items: [
        {
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
      ],
      total: 1,
      page: 0,
      pageSize: 10,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/categories?params=%7B%22page%22%3A0%2C%22pageSize%22%3A10%2C%22status%22%3A%22active%22%7D",
      ),
    );

    expect(mockListAdminCategories).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      search: "",
      status: "active",
      hierarchy: "all",
      inTrash: false,
      sortField: "sortOrder",
      sortDirection: "asc",
    });
    expect(response.status).toBe(200);
  });

  it("returns 400 when params are invalid", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/categories?params=%7B%22pageSize%22%3A13%7D",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_page_size",
    });
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/categories"),
    );

    expect(response.status).toBe(401);
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
      new NextRequest("http://localhost/api/admin/categories"),
    );

    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/categories", () => {
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

  it("creates valid subcategory and returns mutation payload", async () => {
    mockCreateAdminCategory.mockResolvedValue({
      id: "cat-child-1",
      name: "Sábanas",
      slug: "sabanas",
      description: null,
      imageUrl: null,
      parentId: "cat-parent-1",
      parentName: "Dormitorio",
      isActive: true,
      inTrash: false,
      sortOrder: 5,
      seoTitle: null,
      seoDescription: null,
      productsCount: null,
      createdAt: "2026-04-18T10:00:00.000Z",
      updatedAt: "2026-04-18T10:00:00.000Z",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Sábanas",
          slug: "sabanas",
          description: null,
          imageUrl: null,
          parentId: "cat-parent-1",
          sortOrder: 5,
          isActive: true,
          seoTitle: null,
          seoDescription: null,
        }),
      }),
    );

    expect(mockCreateAdminCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sábanas",
        parentId: "cat-parent-1",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when parent category does not exist", async () => {
    mockCreateAdminCategory.mockRejectedValue({
      type: "not_found",
      message: "category_parent_not_found",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: "Sábanas",
          slug: "sabanas",
          description: null,
          imageUrl: null,
          parentId: "cat-parent-missing",
          sortOrder: 5,
          isActive: true,
          seoTitle: null,
          seoDescription: null,
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      type: "not_found",
      message: "category_parent_not_found",
    });
  });
});
