/** @jest-environment node */
import { CatalogMediaError } from "@/domains/admin/media/services/catalog_media_error";
import {
  cancelCatalogImageUpload,
  completeCatalogImageUpload,
  getCatalogGallery,
  prepareCatalogImageUpload,
} from "@/domains/admin/media/services/catalog_media_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DELETE, POST, PUT } from "./route";

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: (source: NextResponse, target: NextResponse) => {
    source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    return target;
  },
}));
jest.mock("@/domains/admin/media/services/catalog_media_service", () => ({
  getCatalogGallery: jest.fn(),
  prepareCatalogImageUpload: jest.fn(),
  completeCatalogImageUpload: jest.fn(),
  cancelCatalogImageUpload: jest.fn(),
  restoreCatalogImage: jest.fn(),
  saveCatalogGallery: jest.fn(),
  uploadCatalogImage: jest.fn(),
}));
const user = {
  id: "admin",
  authUserId: "auth",
  email: "admin@example.com",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "QA", lastName: "Admin" },
} satisfies NonNullable<Awaited<ReturnType<typeof resolveCurrentUser>>>;
const ctx = { params: Promise.resolve({ productId: "p1" }) };
const gallery = {
  images: [],
  trash: [],
  resolvedImages: [],
  source: "none",
  revision: "a".repeat(64),
  limit: 10,
} satisfies Awaited<ReturnType<typeof getCatalogGallery>>;
const url = "http://localhost/api/admin/products/p1/media";

describe("signed upload API authorization and contracts", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(resolveCurrentUser).mockResolvedValue(user);
    jest
      .mocked(createRouteHandlerSupabaseClient)
      .mockImplementation((_request, response) => {
        response.cookies.set("sb-refreshed", "ok");
        return {} as ReturnType<typeof createRouteHandlerSupabaseClient>;
      });
    jest.mocked(prepareCatalogImageUpload).mockResolvedValue({
      imageId: "new",
      signedUrl: "https://storage.test/signed",
    });
    jest.mocked(completeCatalogImageUpload).mockResolvedValue(gallery);
    jest
      .mocked(cancelCatalogImageUpload)
      .mockResolvedValue({ cancelled: true });
  });
  const prepare = {
    variantId: null,
    revision: "a".repeat(64),
    fileName: "a.png",
    contentType: "image/png",
    size: 5242880,
  };
  const finish = { variantId: "v1", imageId: "scoped" };
  function request(method: string, body: object) {
    return new NextRequest(url + "/upload", {
      method,
      body: JSON.stringify(body),
    });
  }
  it.each([POST, PUT, DELETE])(
    "rejects anonymous requests before parsing",
    async (handler) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue(null);
      expect((await handler(request("POST", {}), ctx)).status).toBe(401);
      expect(prepareCatalogImageUpload).not.toHaveBeenCalled();
    },
  );
  it.each(["support", "customer"] as const)(
    "denies %s for all mutations",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
      for (const handler of [POST, PUT, DELETE])
        expect((await handler(request("POST", prepare), ctx)).status).toBe(403);
    },
  );
  it.each(["admin", "super_admin"] as const)(
    "prepares a bounded ticket for %s",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
      const response = await POST(request("POST", prepare), ctx);
      expect(response.status).toBe(201);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.cookies.get("sb-refreshed")?.value).toBe("ok");
      expect(prepareCatalogImageUpload).toHaveBeenCalledWith({
        ...prepare,
        productId: "p1",
      });
    },
  );
  it.each([
    { ...prepare, size: 5242881 },
    { ...prepare, size: 0 },
    { ...prepare, contentType: "image/svg+xml" },
    { ...prepare, extra: "unexpected" },
  ])("rejects invalid prepare payload", async (body) => {
    expect((await POST(request("POST", body), ctx)).status).toBe(400);
    expect(prepareCatalogImageUpload).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and missing IDs", async () => {
    expect(
      (await POST(new NextRequest(url, { method: "POST", body: "{" }), ctx))
        .status,
    ).toBe(400);
    expect((await PUT(request("PUT", { variantId: null }), ctx)).status).toBe(
      400,
    );
  });
  it("scopes completion and pending cancellation", async () => {
    expect((await PUT(request("PUT", finish), ctx)).status).toBe(200);
    expect(completeCatalogImageUpload).toHaveBeenCalledWith(
      { productId: "p1", variantId: "v1" },
      "scoped",
    );
    expect((await DELETE(request("DELETE", finish), ctx)).status).toBe(200);
    expect(cancelCatalogImageUpload).toHaveBeenCalledWith(
      { productId: "p1", variantId: "v1" },
      "scoped",
    );
  });
  it("preserves no-store and refreshed cookies on revision conflict", async () => {
    jest
      .mocked(completeCatalogImageUpload)
      .mockRejectedValue(new CatalogMediaError("conflict", "media_conflict"));
    const response = await PUT(request("PUT", finish), ctx);
    expect(response.status).toBe(409);
    expect(response.cookies.get("sb-refreshed")?.value).toBe("ok");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
