/** @jest-environment node */
import {
  getInventory,
  mutateInventory,
  setInventoryMinimum,
} from "@/domains/admin/inventory/services/inventory_service";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH, POST } from "./route";
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(
    (_r: NextRequest, response: NextResponse) => {
      response.cookies.set("qa-refresh", "ok");
      return {};
    },
  ),
  copySupabaseResponseCookies: (source: NextResponse, target: NextResponse) => {
    source.cookies.getAll().forEach((c) => target.cookies.set(c.name, c.value));
    return target;
  },
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/domains/admin/inventory/services/inventory_service", () => ({
  getInventory: jest.fn(),
  mutateInventory: jest.fn(),
  setInventoryMinimum: jest.fn(),
}));
const current = jest.mocked(resolveCurrentUser),
  mutate = jest.mocked(mutateInventory),
  minimum = jest.mocked(setInventoryMinimum),
  read = jest.mocked(getInventory);
const admin = {
  id: "admin",
  authUserId: "auth",
  email: "qa@example.com",
  role: UserRole.admin,
  status: UserStatus.active,
  emailVerified: true,
  profile: { firstName: "QA", lastName: null },
};
const params = { params: Promise.resolve({ productId: "qa-product" }) };
const input = {
  operationId: "a48273ef-08be-4cb8-8cbb-4d927349b30a",
  kind: "entry",
  rows: [
    {
      variantId: "qa-variant",
      expectedRevision: 0,
      quantity: 2,
      reason: "QA reception",
    },
  ],
};
const request = (method: string, body: object | string = input) =>
  new NextRequest("http://localhost/api/admin/products/qa-product/inventory", {
    method,
    ...(method === "GET"
      ? {}
      : {
          body: typeof body === "string" ? body : JSON.stringify(body),
          headers: { "content-type": "application/json" },
        }),
  });
beforeEach(() => {
  jest.clearAllMocks();
  current.mockResolvedValue(admin);
  mutate.mockResolvedValue({ operationId: input.operationId });
  minimum.mockResolvedValue({ operationId: input.operationId });
  read.mockResolvedValue({
    readOnly: false,
    variants: [],
    movements: [],
    nextCursor: null,
  });
});
test.each([GET, POST, PATCH])(
  "requires admin before parsing body or querying",
  async (run) => {
    for (const user of [null, { ...admin, role: UserRole.customer }]) {
      current.mockResolvedValue(user);
      const r = await run(
        request(run === GET ? "GET" : "POST", "{bad"),
        params,
      );
      expect(r.status).toBe(user ? 403 : 401);
      expect(r.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(read).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
    expect(minimum).not.toHaveBeenCalled();
  },
);
test("binds verified actor, carries refreshed cookies and private noindex headers", async () => {
  const r = await POST(request("POST"), params);
  expect(r.status).toBe(200);
  expect(mutate).toHaveBeenCalledWith("qa-product", input, {
    id: "admin",
    label: "QA",
  });
  expect(r.cookies.get("qa-refresh")?.value).toBe("ok");
  expect(r.headers.get("x-robots-tag")).toContain("noindex");
});
test("rejects injected actor and malformed bodies without writing", async () => {
  expect(
    (await POST(request("POST", { ...input, actorId: "forged" }), params))
      .status,
  ).toBe(400);
  expect((await POST(request("POST", "{bad"), params)).status).toBe(400);
  expect(mutate).not.toHaveBeenCalled();
});
test("minimum null and zero are explicit and cannot accept stock writes", async () => {
  const body = {
    operationId: input.operationId,
    variantId: "v",
    expectedRevision: 0,
    minimum: null,
  };
  expect((await PATCH(request("PATCH", body), params)).status).toBe(200);
  expect(
    (await PATCH(request("PATCH", { ...body, stock: 8 }), params)).status,
  ).toBe(400);
});
test("maps conflicts without exposing unexpected database details", async () => {
  mutate.mockRejectedValueOnce(
    new CatalogOperationError("conflict", "inventory_conflict"),
  );
  expect((await POST(request("POST"), params)).status).toBe(409);
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  mutate.mockRejectedValueOnce(new Error("secret-database-detail"));
  const r = await POST(request("POST"), params);
  expect(r.status).toBe(500);
  expect(await r.text()).not.toContain("secret-database-detail");
  spy.mockRestore();
});
