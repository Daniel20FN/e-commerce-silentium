/** @jest-environment node */
import { CatalogMediaError } from "@/domains/admin/media/services/catalog_media_error";
import {
  getCatalogGallery,
  restoreCatalogImage,
  saveCatalogGallery,
  uploadCatalogImage,
} from "@/domains/admin/media/services/catalog_media_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH, POST, PUT } from "./route";

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

describe("catalog media routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(resolveCurrentUser).mockResolvedValue(user);
    jest
      .mocked(createRouteHandlerSupabaseClient)
      .mockImplementation((_request, response) => {
        response.cookies.set("sb-refreshed", "ok");
        return {} as ReturnType<typeof createRouteHandlerSupabaseClient>;
      });
    jest.mocked(getCatalogGallery).mockResolvedValue(gallery);
    jest.mocked(saveCatalogGallery).mockResolvedValue(gallery);
    jest.mocked(restoreCatalogImage).mockResolvedValue(gallery);
    jest.mocked(uploadCatalogImage).mockResolvedValue(gallery);
  });
  it.each(["GET", "POST", "PUT", "PATCH"])(
    "rejects anonymous %s before parsing body",
    async (method) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue(null);
      const handler = { GET, POST, PUT, PATCH }[method];
      const result = await handler!(new NextRequest(url, { method }), ctx);
      expect(result.status).toBe(401);
      expect(result.headers.get("Cache-Control")).toContain("no-store");
      expect(uploadCatalogImage).not.toHaveBeenCalled();
    },
  );
  it.each(["support", "customer"] as const)("denies %s", async (role) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
    expect((await GET(new NextRequest(url), ctx)).status).toBe(403);
  });
  it.each(["admin", "super_admin"] as const)(
    "returns scoped gallery for %s with refreshed cookies",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
      const response = await GET(
        new NextRequest(
          url +
            "?params=" +
            encodeURIComponent(JSON.stringify({ variantId: "v1" })),
        ),
        ctx,
      );
      expect(response.status).toBe(200);
      expect(response.cookies.get("sb-refreshed")?.value).toBe("ok");
      expect(getCatalogGallery).toHaveBeenCalledWith({
        productId: "p1",
        variantId: "v1",
      });
    },
  );
  it("rejects duplicate image ids before mutation", async () => {
    const response = await PUT(
      new NextRequest(url, {
        method: "PUT",
        body: JSON.stringify({
          revision: gallery.revision,
          variantId: null,
          images: [
            { id: "a", altText: "" },
            { id: "a", altText: "" },
          ],
        }),
      }),
      ctx,
    );
    expect(response.status).toBe(400);
    expect(saveCatalogGallery).not.toHaveBeenCalled();
  });
  it("saves a scoped snapshot and restores without any physical delete route", async () => {
    const params = {
      variantId: "v1",
      revision: gallery.revision,
      images: [{ id: "a", altText: "Imagen" }],
    };
    expect(
      (
        await PUT(
          new NextRequest(url, { method: "PUT", body: JSON.stringify(params) }),
          ctx,
        )
      ).status,
    ).toBe(200);
    expect(saveCatalogGallery).toHaveBeenCalledWith(
      { productId: "p1", variantId: "v1" },
      params,
    );
    expect(
      (
        await PATCH(
          new NextRequest(url, {
            method: "PATCH",
            body: JSON.stringify({
              variantId: null,
              revision: gallery.revision,
              imageId: "a",
            }),
          }),
          ctx,
        )
      ).status,
    ).toBe(200);
    expect(restoreCatalogImage).toHaveBeenCalledWith(
      { productId: "p1", variantId: null },
      "a",
      gallery.revision,
    );
  });
  it("maps conflicts and foreign-target errors, preserving auth cookies", async () => {
    jest
      .mocked(getCatalogGallery)
      .mockRejectedValueOnce(
        new CatalogMediaError("conflict", "media_conflict"),
      );
    const response = await GET(new NextRequest(url), ctx);
    expect(response.status).toBe(409);
    expect(response.cookies.has("sb-refreshed")).toBe(true);
    jest
      .mocked(getCatalogGallery)
      .mockRejectedValueOnce(
        new CatalogMediaError("not_found", "media_target_not_found"),
      );
    expect((await GET(new NextRequest(url), ctx)).status).toBe(404);
  });
  it("accepts multipart files only after auth and delegates typed fields", async () => {
    const form = new FormData();
    form.set("file", new File(["png"], "photo.png", { type: "image/png" }));
    form.set("revision", gallery.revision);
    form.set("variantId", "v1");
    const response = await POST(
      new NextRequest(url, { method: "POST", body: form }),
      ctx,
    );
    expect(response.status).toBe(201);
    expect(uploadCatalogImage).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p1",
        variantId: "v1",
        revision: gallery.revision,
        file: expect.any(File),
      }),
    );
  });
  it("rejects oversized multipart bodies and malformed JSON", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(6 * 1024 * 1024)], "large.png", {
        type: "image/png",
      }),
    );
    form.set("revision", gallery.revision);
    expect(
      (await POST(new NextRequest(url, { method: "POST", body: form }), ctx))
        .status,
    ).toBe(400);
    expect(uploadCatalogImage).not.toHaveBeenCalled();
    expect(
      (await PUT(new NextRequest(url, { method: "PUT", body: "{" }), ctx))
        .status,
    ).toBe(400);
  });
});
