/** @jest-environment node */
import {
  restoreAdminVariant,
  softDeleteAdminVariant,
} from "@/domains/admin/products/services/admin_variant_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: <T>(
    source: NextResponse,
    target: NextResponse<T>,
  ): NextResponse<T> => {
    source.cookies
      .getAll()
      .forEach((cookie) =>
        target.cookies.set(cookie.name, cookie.value, cookie),
      );
    return target;
  },
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/domains/admin/products/services/admin_variant_service", () => ({
  restoreAdminVariant: jest.fn(),
  softDeleteAdminVariant: jest.fn(),
}));

const admin = {
  id: "admin",
  authUserId: "auth-admin",
  email: "admin@example.com",
  role: UserRole.admin,
  status: UserStatus.active,
  emailVerified: true,
  profile: { firstName: "QA", lastName: "Admin" },
};
const variant = {
  id: "v1",
  productId: "p1",
  sku: "QA",
  priceCents: 100,
  compareAtPriceCents: null,
  stock: 1,
  active: true,
  isDefault: false,
  displayOrder: 0,
  weightGrams: 123,
  widthMm: 100,
  heightMm: 200,
  lengthMm: 300,
  optionValues: [],
  inTrash: false,
  createdAt: "2026-10-16T00:00:00.000Z",
  updatedAt: "2026-10-16T00:00:00.000Z",
};
const invoke = (action = "trash") =>
  POST(
    new NextRequest(
      "http://localhost/api/admin/products/p1/variants/v1/" + action,
      { method: "POST" },
    ),
    { params: Promise.resolve({ productId: "p1", variantId: "v1", action }) },
  );

describe("variant lifecycle route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(createRouteHandlerSupabaseClient)
      .mockImplementation((_request, response) => {
        response.cookies.set("sb-refresh", "refreshed");
        return { auth: {} } as never;
      });
    jest.mocked(resolveCurrentUser).mockResolvedValue(admin);
    jest
      .mocked(softDeleteAdminVariant)
      .mockResolvedValue({ ...variant, inTrash: true });
    jest.mocked(restoreAdminVariant).mockResolvedValue(variant);
  });

  it.each([UserRole.admin, UserRole.super_admin])(
    "allows %s and scopes mutation to the parent product",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...admin, role });
      const response = await invoke();
      expect(response.status).toBe(200);
      expect(softDeleteAdminVariant).toHaveBeenCalledWith("p1", "v1");
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.cookies.get("sb-refresh")?.value).toBe("refreshed");
    },
  );

  it("restores without rebuilding the variant payload", async () => {
    expect((await invoke("restore")).status).toBe(200);
    expect(restoreAdminVariant).toHaveBeenCalledWith("p1", "v1");
  });

  it("rejects anonymous requests", async () => {
    jest.mocked(resolveCurrentUser).mockResolvedValue(null);
    expect((await invoke()).status).toBe(401);
    expect(softDeleteAdminVariant).not.toHaveBeenCalled();
  });

  it.each([UserRole.customer, UserRole.support])(
    "forbids %s without changing security policy",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...admin, role });
      expect((await invoke()).status).toBe(403);
      expect(softDeleteAdminVariant).not.toHaveBeenCalled();
    },
  );

  it("returns 404 and refresh cookies for mismatched nested resources", async () => {
    jest
      .mocked(softDeleteAdminVariant)
      .mockRejectedValue({ type: "not_found", message: "record_not_found" });
    const response = await invoke();
    expect(response.status).toBe(404);
    expect(response.cookies.get("sb-refresh")?.value).toBe("refreshed");
  });

  it("rejects unknown lifecycle actions", async () => {
    expect((await invoke("purge")).status).toBe(400);
    expect(softDeleteAdminVariant).not.toHaveBeenCalled();
  });
});
