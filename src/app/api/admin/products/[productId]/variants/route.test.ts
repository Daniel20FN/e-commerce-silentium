/** @jest-environment node */

import {
  createAdminVariant,
  updateAdminVariant,
} from "@/domains/admin/products/services/admin_variant_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { PATCH, POST } from "./route";

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

jest.mock("@/domains/admin/products/services/admin_variant_service", () => ({
  createAdminVariant: jest.fn(),
  updateAdminVariant: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockCreateAdminVariant = jest.mocked(createAdminVariant);
const mockUpdateAdminVariant = jest.mocked(updateAdminVariant);

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

const variantInput = {
  sku: "SIL-PILLOW-WHITE",
  priceCents: 159900,
  compareAtPriceCents: 189900,
  stock: 12,
  active: true,
  isDefault: true,
  displayOrder: 1,
  weightGrams: null,
  widthMm: null,
  heightMm: null,
  lengthMm: null,
  optionValueIds: ["value-white"],
};

const variantDto = {
  id: "variant-1",
  productId: "product-1",
  sku: "SIL-PILLOW-WHITE",
  priceCents: 159900,
  compareAtPriceCents: 189900,
  stock: 12,
  active: true,
  isDefault: true,
  displayOrder: 1,
  weightGrams: null,
  widthMm: null,
  heightMm: null,
  lengthMm: null,
  optionValues: [],
  inTrash: false,
  createdAt: "2026-06-09T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
};

function createVariantRequest(
  method: "POST" | "PATCH",
  body: unknown,
): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/products/product-1/variants",
    {
      method,
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

describe("POST /api/admin/products/[productId]/variants", () => {
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

  it("creates variant for product", async () => {
    mockCreateAdminVariant.mockResolvedValue(variantDto);

    const response = await POST(createVariantRequest("POST", variantInput), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(mockCreateAdminVariant).toHaveBeenCalledWith(
      "product-1",
      expect.objectContaining({ sku: "SIL-PILLOW-WHITE" }),
      undefined,
      expect.objectContaining({ id: adminUser.id }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
    await expect(response.json()).resolves.toEqual({
      data: { variant: variantDto },
    });
  });

  it("returns 400 for invalid compare-at price", async () => {
    const response = await POST(
      createVariantRequest("POST", {
        ...variantInput,
        compareAtPriceCents: 100,
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "variant_compare_at_price_invalid",
    });
  });

  it("returns validation_error invalid_json for malformed create JSON", async () => {
    const response = await POST(createVariantRequest("POST", "{not-json"), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(400);
    expect(mockCreateAdminVariant).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("returns 401 when creating variant without a current user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST(createVariantRequest("POST", variantInput), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockCreateAdminVariant).not.toHaveBeenCalled();
  });

  it("returns 403 when creating variant without admin access", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      ...adminUser,
      role: UserRole.support,
    });

    const response = await POST(createVariantRequest("POST", variantInput), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockCreateAdminVariant).not.toHaveBeenCalled();
  });

  it("maps SKU conflicts to 409", async () => {
    mockCreateAdminVariant.mockRejectedValue({
      type: "conflict",
      message: "variant_sku_conflict",
    });

    const response = await POST(createVariantRequest("POST", variantInput), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/admin/products/[productId]/variants", () => {
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

  it("updates variant when variantId is provided", async () => {
    mockUpdateAdminVariant.mockResolvedValue({ ...variantDto, stock: 20 });

    const response = await PATCH(
      createVariantRequest("PATCH", {
        variantId: "variant-1",
        ...variantInput,
        stock: 20,
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockUpdateAdminVariant).toHaveBeenCalledWith(
      "product-1",
      "variant-1",
      expect.objectContaining({ stock: 20 }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
  });

  it("returns validation_error invalid_json for malformed update JSON", async () => {
    const response = await PATCH(createVariantRequest("PATCH", "{not-json"), {
      params: Promise.resolve({ productId: "product-1" }),
    });

    expect(response.status).toBe(400);
    expect(mockUpdateAdminVariant).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("maps product-scoped variant mismatches to 404", async () => {
    mockUpdateAdminVariant.mockRejectedValue({
      type: "not_found",
      message: "record_not_found",
    });

    const response = await PATCH(
      createVariantRequest("PATCH", {
        variantId: "variant-from-other-product",
        ...variantInput,
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockUpdateAdminVariant).toHaveBeenCalledWith(
      "product-1",
      "variant-from-other-product",
      expect.objectContaining({ sku: "SIL-PILLOW-WHITE" }),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      type: "not_found",
      message: "record_not_found",
    });
  });
});
