/** @jest-environment node */

import { ADMIN_STORAGE_IMAGE_CACHE_CONTROL } from "@/domains/admin/storage/services/admin_storage_image";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseCatalogStorageBucket } from "@/lib/supabase/shared";
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

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock("@/lib/supabase/shared", () => ({
  getSupabaseCatalogStorageBucket: jest.fn(),
}));

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockCreateSupabaseAdminClient = jest.mocked(createSupabaseAdminClient);
const mockGetSupabaseCatalogStorageBucket = jest.mocked(
  getSupabaseCatalogStorageBucket,
);

describe("POST /api/admin/storage/images", () => {
  const upload = jest.fn();
  const getPublicUrl = jest.fn();
  const currentDate = "2026-04-18";

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .useFakeTimers()
      .setSystemTime(new Date(`${currentDate}T10:00:00.000Z`));
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://example.supabase.co/storage/v1/object/public/catalog-images/catalog/product/sku-1/file.jpg",
      },
    });

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
    mockGetSupabaseCatalogStorageBucket.mockReturnValue("catalog-images");
    mockCreateSupabaseAdminClient.mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload,
          getPublicUrl,
        }),
      },
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "categoria.png", {
        type: "image/png",
      }),
    );
    formData.set("scope", "category");

    const response = await POST(
      new NextRequest("http://localhost/api/admin/storage/images", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      type: "unauthorized",
      message: "unauthorized",
    });
  });

  it("rejects unsupported image types", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["<svg />"], "vector.svg", {
        type: "image/svg+xml",
      }),
    );
    formData.set("scope", "product");

    const response = await POST(
      new NextRequest("http://localhost/api/admin/storage/images", {
        method: "POST",
        body: formData,
      }),
    );

    expect(upload).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "unsupported_image_type",
    });
  });

  it("uploads validated images and returns reusable metadata", async () => {
    jest.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-ruta");

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "catalogo.webp", {
        type: "image/webp",
      }),
    );
    formData.set("scope", "variant");
    formData.set("entityId", "variant_001");

    const response = await POST(
      new NextRequest("http://localhost/api/admin/storage/images", {
        method: "POST",
        body: formData,
      }),
    );

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0]).toBe(
      `catalog/variant/variant_001/${currentDate}/uuid-ruta-catalogo.webp`,
    );
    expect(upload.mock.calls[0]?.[2]).toEqual({
      cacheControl: ADMIN_STORAGE_IMAGE_CACHE_CONTROL,
      contentType: "image/webp",
      upsert: false,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        bucket: "catalog-images",
        contentType: "image/webp",
        entityId: "variant_001",
        originalName: "catalogo.webp",
        path: `catalog/variant/variant_001/${currentDate}/uuid-ruta-catalogo.webp`,
        publicUrl:
          "https://example.supabase.co/storage/v1/object/public/catalog-images/catalog/product/sku-1/file.jpg",
        scope: "variant",
        size: 3,
      },
    });
  });
});
