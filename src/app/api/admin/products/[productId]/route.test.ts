/** @jest-environment node */

import {
  getAdminProductDetail,
  updateAdminProduct,
} from "@/domains/admin/products/services/admin_product_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH } from "./route";

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
  getAdminProductDetail: jest.fn(),
  updateAdminProduct: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockUpdateAdminProduct = jest.mocked(updateAdminProduct);
const mockGetAdminProductDetail = jest.mocked(getAdminProductDetail);

const adminUser = {
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
  primaryCategory: null,
  categories: [],
  variantCount: 0,
  sellableVariantCount: 0,
  hasSellableVariants: false,
  warnings: ["product_has_no_sellable_variants" as const],
  archivedAt: null,
  createdAt: "2026-06-09T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
};

describe("PATCH /api/admin/products/[productId]", () => {
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

  it("updates product payload for admin role", async () => {
    mockUpdateAdminProduct.mockResolvedValue(productDto);

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/products/product-1", {
        method: "PATCH",
        body: JSON.stringify(productInput),
      }),
      {
        params: Promise.resolve({ productId: "product-1" }),
      },
    );

    expect(mockUpdateAdminProduct).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ slug: "silentium-pillow" }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
    await expect(response.json()).resolves.toEqual({
      data: {
        product: productDto,
      },
    });
  });

  it("returns validation_error invalid_json for malformed JSON", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/products/product-1", {
        method: "PATCH",
        body: "{not-json",
      }),
      {
        params: Promise.resolve({ productId: "product-1" }),
      },
    );

    expect(response.status).toBe(400);
    expect(mockUpdateAdminProduct).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("returns 400 for invalid update payload", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/products/product-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({ productId: "product-1" }),
      },
    );

    expect(response.status).toBe(400);
    expect(mockUpdateAdminProduct).not.toHaveBeenCalled();
  });

  it("maps validation service errors to 400", async () => {
    mockUpdateAdminProduct.mockRejectedValue({
      type: "validation_error",
      message: "product_primary_category_invalid",
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/products/product-1", {
        method: "PATCH",
        body: JSON.stringify(productInput),
      }),
      {
        params: Promise.resolve({ productId: "product-1" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "product_primary_category_invalid",
    });
  });
});

describe("GET /api/admin/products/[productId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
    mockResolveCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns product detail used to hydrate named options", async () => {
    const detail = {
      ...productDto,
      optionsLocked: false,
      options: [
        {
          id: "option-size",
          name: "Tamaño",
          displayOrder: 0,
          values: [{ id: "value-queen", value: "Queen", displayOrder: 0 }],
        },
      ],
    };
    mockGetAdminProductDetail.mockResolvedValue(detail);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/products/product-1"),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockGetAdminProductDetail).toHaveBeenCalledWith("product-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { product: detail },
    });
  });
});
