/** @jest-environment node */
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { duplicateProduct } from "@/domains/admin/products/services/duplicate_product_service";
import { updatePriceBatch } from "@/domains/admin/products/services/price_batch_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "../prices/route";
import { POST } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(
    (_request: NextRequest, response: NextResponse) => {
      response.cookies.set("qa-refresh", "refreshed");
      return {};
    },
  ),
  copySupabaseResponseCookies: (source: NextResponse, target: NextResponse) => {
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
jest.mock(
  "@/domains/admin/products/services/duplicate_product_service",
  () => ({ duplicateProduct: jest.fn() }),
);
jest.mock("@/domains/admin/products/services/price_batch_service", () => ({
  updatePriceBatch: jest.fn(),
}));
const current = jest.mocked(resolveCurrentUser),
  duplicate = jest.mocked(duplicateProduct),
  batch = jest.mocked(updatePriceBatch);
const admin = {
  id: "admin",
  authUserId: "admin",
  email: "qa@example.com",
  role: UserRole.super_admin,
  status: UserStatus.active,
  emailVerified: true,
  profile: { firstName: "QA", lastName: null },
};
const revision = "2026-10-20T00:00:00.000Z";
const operations = [
  {
    label: "duplicate",
    method: "POST",
    run: POST,
    body: {
      operationId: "14170c9c-9785-4e50-bcb0-5b697316701e",
      expectedUpdatedAt: revision,
      copyCosts: false,
    },
  },
  {
    label: "prices",
    method: "PATCH",
    run: PATCH,
    body: {
      expectedProductUpdatedAt: revision,
      rows: [
        {
          variantId: "v",
          expectedUpdatedAt: revision,
          priceCents: 100,
          compareAtPriceCents: null,
        },
      ],
    },
  },
];
describe.each(operations)(
  "$label private route",
  ({ label, method, run, body }) => {
    const params = { params: Promise.resolve({ productId: "qa" }) };
    const request = (text = JSON.stringify(body)) =>
      new NextRequest(`http://localhost/api/admin/products/qa/${label}`, {
        method,
        body: text,
        headers: { "content-type": "application/json" },
      });
    beforeEach(() => {
      jest.clearAllMocks();
      duplicate.mockReset();
      batch.mockReset();
      current.mockResolvedValue(admin);
      duplicate.mockResolvedValue({ productId: "copy", skippedCategories: 0 });
      batch.mockResolvedValue({ updated: 1 });
    });
    it("authorizes before parsing a malformed body, rejects customers and never calls a write service", async () => {
      for (const user of [null, { ...admin, role: UserRole.customer }]) {
        current.mockResolvedValue(user);
        const response = await run(request("{bad"), params);
        expect(response.status).toBe(user ? 403 : 401);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
        expect(response.cookies.get("qa-refresh")?.value).toBe("refreshed");
      }
      expect(duplicate).not.toHaveBeenCalled();
      expect(batch).not.toHaveBeenCalled();
    });
    it("validates route/body and rejects injected stock without writing", async () => {
      expect((await run(request("{bad"), params)).status).toBe(400);
      expect(
        (await run(request(JSON.stringify({ ...body, stock: 100 })), params))
          .status,
      ).toBe(400);
      expect(
        (await run(request(), { params: Promise.resolve({ productId: "" }) }))
          .status,
      ).toBe(400);
      expect(duplicate).not.toHaveBeenCalled();
      expect(batch).not.toHaveBeenCalled();
    });
    it("returns private success with refreshed cookies", async () => {
      const response = await run(request(), params);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.cookies.get("qa-refresh")?.value).toBe("refreshed");
      if (label === "duplicate")
        expect(duplicate).toHaveBeenCalledWith("qa", body, {
          id: admin.id,
          label: "QA",
        });
      else expect(batch).toHaveBeenCalledWith("qa", body);
    });
    it("maps conflicts and hides database details on unexpected errors", async () => {
      duplicate
        .mockRejectedValueOnce(
          new CatalogOperationError("conflict", "operation_retry"),
        )
        .mockRejectedValueOnce(new Error("PRIVATE_DATABASE_DETAIL"));
      batch
        .mockRejectedValueOnce(
          new CatalogOperationError("conflict", "operation_retry"),
        )
        .mockRejectedValueOnce(new Error("PRIVATE_DATABASE_DETAIL"));
      expect((await run(request(), params)).status).toBe(409);
      const response = await run(request(), params);
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain("PRIVATE_DATABASE_DETAIL");
    });
  },
);
