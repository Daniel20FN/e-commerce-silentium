/** @jest-environment node */

import {
  createAdminProduct,
  listAdminProducts,
} from "@/domains/admin/products/services/admin_product_service";
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

jest.mock("@/domains/admin/products/services/admin_product_service", () => ({
  createAdminProduct: jest.fn(),
  listAdminProducts: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockListAdminProducts = jest.mocked(listAdminProducts);
const mockCreateAdminProduct = jest.mocked(createAdminProduct);

const adminUser = {
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
};

const productDto = {
  id: "product-1",
  name: "Silentium Pillow",
  slug: "silentium-pillow",
  shortDescription: null,
  longDescription: null,
  status: "active" as const,
  inTrash: false,
  brand: "Silentium",
  seoTitle: null,
  seoDescription: null,
  featured: true,
  primaryCategory: {
    id: "category-1",
    name: "Dormitorio",
    slug: "dormitorio",
    isPrimary: true,
  },
  categories: [
    {
      id: "category-1",
      name: "Dormitorio",
      slug: "dormitorio",
      isPrimary: true,
    },
  ],
  variantCount: 2,
  sellableVariantCount: 1,
  hasSellableVariants: true,
  warnings: [],
  archivedAt: null,
  createdAt: "2026-06-09T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
};

const productInput = {
  name: "Silentium Pillow",
  slug: "silentium-pillow",
  shortDescription: null,
  longDescription: null,
  brand: "Silentium",
  seoTitle: null,
  seoDescription: null,
  featured: true,
  status: "active",
  categoryIds: ["category-1"],
  primaryCategoryId: "category-1",
};

describe("GET /api/admin/products", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockImplementation(
      (_request, response: NextResponse<unknown>) => {
        response.cookies.set("sb-refresh-token", "refreshed");
        return { auth: {} } as never;
      },
    );
    mockResolveCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns products for admin users with no-store cache headers", async () => {
    mockListAdminProducts.mockResolvedValue({
      items: [productDto],
      total: 1,
      page: 0,
      pageSize: 10,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/products?params=%7B%22page%22%3A0%2C%22pageSize%22%3A10%2C%22status%22%3A%22active%22%2C%22featured%22%3Atrue%7D",
      ),
    );

    expect(mockListAdminProducts).toHaveBeenCalledWith({
      page: 0,
      pageSize: 10,
      search: "",
      status: "active",
      featured: true,
      inTrash: false,
      sortField: "updatedAt",
      sortDirection: "desc",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
    await expect(response.json()).resolves.toEqual({
      data: {
        items: [productDto],
        total: 1,
        page: 0,
        pageSize: 10,
      },
    });
  });

  it("returns 400 when list params are invalid", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/products?params=%7B%22pageSize%22%3A13%7D",
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
      new NextRequest("http://localhost/api/admin/products"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when user has no admin access", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      ...adminUser,
      role: UserRole.support,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/products"),
    );

    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/products", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockImplementation(
      (_request, response: NextResponse<unknown>) => {
        response.cookies.set("sb-refresh-token", "refreshed");
        return { auth: {} } as never;
      },
    );
    mockResolveCurrentUser.mockResolvedValue(adminUser);
  });

  it("creates product and returns mutation payload", async () => {
    mockCreateAdminProduct.mockResolvedValue(productDto);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify(productInput),
      }),
    );

    expect(mockCreateAdminProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Silentium Pillow",
        categoryIds: ["category-1"],
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        product: productDto,
      },
    });
  });

  it("returns validation_error invalid_json for malformed JSON", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockCreateAdminProduct).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("maps unsupported service error types to internal errors", async () => {
    mockCreateAdminProduct.mockRejectedValue({
      type: "unexpected_type",
      message: "should_not_leak",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify(productInput),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      type: "internal_server_error",
      message: "internal_server_error",
    });
  });

  it("maps service conflicts to 409", async () => {
    mockCreateAdminProduct.mockRejectedValue({
      type: "conflict",
      message: "product_slug_conflict",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify(productInput),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      type: "conflict",
      message: "product_slug_conflict",
    });
  });
});
