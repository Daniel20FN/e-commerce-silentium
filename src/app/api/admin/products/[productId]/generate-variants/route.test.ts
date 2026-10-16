/** @jest-environment node */

import {
  confirmAdminVariantGeneration,
  previewAdminVariantGeneration,
} from "@/domains/admin/products/services/admin_variant_generation_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { POST, PUT } from "./route";

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
  "@/domains/admin/products/services/admin_variant_generation_service",
  () => ({
    confirmAdminVariantGeneration: jest.fn(),
    previewAdminVariantGeneration: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockPreviewAdminVariantGeneration = jest.mocked(
  previewAdminVariantGeneration,
);
const mockConfirmAdminVariantGeneration = jest.mocked(
  confirmAdminVariantGeneration,
);

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

describe("/api/admin/products/[productId]/generate-variants", () => {
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

  it("previews generated variant combinations", async () => {
    mockPreviewAdminVariantGeneration.mockResolvedValue({
      combinations: [
        {
          optionValueIds: ["value-white"],
          optionCombinationKey: "value-white",
          label: "Color: Blanco",
        },
      ],
      duplicateCombinations: [],
    });

    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "POST",
          body: JSON.stringify({ optionIds: ["option-color"] }),
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockPreviewAdminVariantGeneration).toHaveBeenCalledWith(
      "product-1",
      { optionIds: ["option-color"] },
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
    await expect(response.json()).resolves.toEqual({
      data: {
        combinations: [
          {
            optionValueIds: ["value-white"],
            optionCombinationKey: "value-white",
            label: "Color: Blanco",
          },
        ],
        duplicateCombinations: [],
      },
    });
  });

  it("confirms generated variants explicitly", async () => {
    mockConfirmAdminVariantGeneration.mockResolvedValue({
      created: [variantDto],
      skippedDuplicateCombinationKeys: ["value-blue"],
    });

    const response = await PUT(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "PUT",
          body: JSON.stringify({ variants: [variantInput] }),
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockConfirmAdminVariantGeneration).toHaveBeenCalledWith(
      "product-1",
      { variants: [expect.objectContaining({ sku: "SIL-PILLOW-WHITE" })] },
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
  });

  it("returns validation_error invalid_json for malformed preview JSON", async () => {
    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "POST",
          body: "{not-json",
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mockPreviewAdminVariantGeneration).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("returns validation_error invalid_json for malformed confirm JSON", async () => {
    const response = await PUT(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "PUT",
          body: "{not-json",
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mockConfirmAdminVariantGeneration).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_json",
    });
  });

  it("returns 401 when previewing without a current user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "POST",
          body: JSON.stringify({ optionIds: ["option-color"] }),
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockPreviewAdminVariantGeneration).not.toHaveBeenCalled();
  });

  it("returns 403 when confirming without admin access", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      ...adminUser,
      role: UserRole.support,
    });

    const response = await PUT(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "PUT",
          body: JSON.stringify({ variants: [variantInput] }),
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockConfirmAdminVariantGeneration).not.toHaveBeenCalled();
  });

  it("maps generation validation errors to 400", async () => {
    mockPreviewAdminVariantGeneration.mockRejectedValue(
      new Error("variant_generation_option_invalid"),
    );

    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/products/product-1/generate-variants",
        {
          method: "POST",
          body: JSON.stringify({ optionIds: ["missing-option"] }),
        },
      ),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "variant_generation_option_invalid",
    });
  });
});
