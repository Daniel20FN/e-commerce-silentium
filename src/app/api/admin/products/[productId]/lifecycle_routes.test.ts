/** @jest-environment node */

import {
  archiveAdminProduct,
  restoreAdminProduct,
  trashAdminProduct,
} from "@/domains/admin/products/services/admin_product_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { POST as POST_ARCHIVE } from "./archive/route";
import { POST as POST_RESTORE } from "./restore/route";
import { POST as POST_TRASH } from "./trash/route";

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
  archiveAdminProduct: jest.fn(),
  restoreAdminProduct: jest.fn(),
  trashAdminProduct: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockArchiveAdminProduct = jest.mocked(archiveAdminProduct);
const mockRestoreAdminProduct = jest.mocked(restoreAdminProduct);
const mockTrashAdminProduct = jest.mocked(trashAdminProduct);

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

describe("product lifecycle routes", () => {
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

  it("trashes product through lifecycle service", async () => {
    mockTrashAdminProduct.mockResolvedValue({ ...productDto, inTrash: true });

    const response = await POST_TRASH(
      new NextRequest("http://localhost/api/admin/products/product-1/trash", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockTrashAdminProduct).toHaveBeenCalledWith("product-1");
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
  });

  it("restores product through lifecycle service", async () => {
    mockRestoreAdminProduct.mockResolvedValue(productDto);

    const response = await POST_RESTORE(
      new NextRequest("http://localhost/api/admin/products/product-1/restore", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockRestoreAdminProduct).toHaveBeenCalledWith("product-1");
    expect(response.status).toBe(200);
  });

  it("archives product through lifecycle service", async () => {
    mockArchiveAdminProduct.mockResolvedValue({
      ...productDto,
      status: "archived",
      archivedAt: "2026-06-09T10:30:00.000Z",
    });

    const response = await POST_ARCHIVE(
      new NextRequest("http://localhost/api/admin/products/product-1/archive", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(mockArchiveAdminProduct).toHaveBeenCalledWith("product-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refreshed");
  });

  it("returns 401 when lifecycle action has no current user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST_TRASH(
      new NextRequest("http://localhost/api/admin/products/product-1/trash", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockTrashAdminProduct).not.toHaveBeenCalled();
  });

  it("returns 403 when lifecycle action has no admin access", async () => {
    mockResolveCurrentUser.mockResolvedValue({
      ...adminUser,
      role: UserRole.support,
    });

    const response = await POST_RESTORE(
      new NextRequest("http://localhost/api/admin/products/product-1/restore", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "product-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockRestoreAdminProduct).not.toHaveBeenCalled();
  });

  it("maps lifecycle not-found errors to 404", async () => {
    mockTrashAdminProduct.mockRejectedValue({
      type: "not_found",
      message: "record_not_found",
    });

    const response = await POST_TRASH(
      new NextRequest("http://localhost/api/admin/products/missing/trash", {
        method: "POST",
      }),
      { params: Promise.resolve({ productId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      type: "not_found",
      message: "record_not_found",
    });
  });
});
