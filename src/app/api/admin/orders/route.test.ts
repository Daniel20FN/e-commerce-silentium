/** @jest-environment node */
import * as orders from "@/domains/admin/orders/services/order_service";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET as detail, POST as mutate, PUT as save } from "./[orderId]/route";
import { GET, POST } from "./route";
import { GET as variants } from "./variants/route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: jest.fn(
    <T>(source: NextResponse, target: NextResponse<T>) => {
      source.cookies
        .getAll()
        .forEach((cookie) => target.cookies.set(cookie.name, cookie.value));
      return target;
    },
  ),
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/domains/admin/orders/services/order_service", () => ({
  createOrder: jest.fn(),
  saveOrderDraft: jest.fn(),
  mutateOrder: jest.fn(),
  getOrder: jest.fn(),
  listOrders: jest.fn(),
  searchOrderVariants: jest.fn(),
}));

const actor = { id: "qa-order-admin", label: "QA Admin" };
const admin = {
  id: actor.id,
  authUserId: "qa-order-auth",
  email: "qa@example.invalid",
  role: UserRole.admin,
  status: UserStatus.active,
  emailVerified: true,
  profile: { firstName: "QA", lastName: "Admin" },
};
const props = { params: Promise.resolve({ orderId: "order-1" }) };
const draft = {
  operationId: "ac81e600-a634-4f67-afde-13487fdcd5e4",
  customerName: "QA Customer",
  customerPhone: "+573001234567",
  delivery: "pickup",
  shippingCents: 0,
  lines: [
    {
      variantId: "variant-1",
      quantity: 2,
      unitPriceCents: 10000,
      catalogPriceCents: 10000,
    },
  ],
};
const req = (method = "GET", body?: string) =>
  new NextRequest("http://localhost/api/admin/orders", {
    method,
    ...(body ? { body } : {}),
  });

describe("private manual order routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resolveCurrentUser).mockResolvedValue(admin);
    jest
      .mocked(createRouteHandlerSupabaseClient)
      .mockImplementation((_request, response) => {
        response.cookies.set("sb-qa-refresh", "refreshed");
        return {} as never;
      });
  });

  it.each(["list", "create", "detail", "save", "mutate", "variants"])(
    "authenticates %s before inspecting malformed bodies or queries",
    async (method) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue(null);
      const request = req(
        ["create", "mutate"].includes(method)
          ? "POST"
          : method === "save"
            ? "PUT"
            : "GET",
        ["create", "save", "mutate"].includes(method) ? "{" : undefined,
      );
      const response =
        method === "list"
          ? await GET(request)
          : method === "create"
            ? await POST(request)
            : method === "detail"
              ? await detail(request, props)
              : method === "save"
                ? await save(request, props)
                : method === "mutate"
                  ? await mutate(request, props)
                  : await variants(request);
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
      expect(orders.createOrder).not.toHaveBeenCalled();
      expect(orders.getOrder).not.toHaveBeenCalled();
    },
  );

  it("denies customer access without leaking search results", async () => {
    jest
      .mocked(resolveCurrentUser)
      .mockResolvedValue({ ...admin, role: UserRole.customer });
    const response = await variants(req());
    expect(response.status).toBe(403);
    expect(orders.searchOrderVariants).not.toHaveBeenCalled();
  });

  it("uses the trusted session actor and refresh cookies for creation", async () => {
    const result = { orderId: "order-1", operationId: draft.operationId };
    jest.mocked(orders.createOrder).mockResolvedValue(result);
    const response = await POST(req("POST", JSON.stringify(draft)));
    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-qa-refresh")?.value).toBe("refreshed");
    expect(orders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerName: "QA Customer" }),
      actor,
    );
    expect(await response.json()).toEqual({ data: result });
  });

  it("rejects malformed JSON, unknown fields and invalid return quantities", async () => {
    expect((await POST(req("POST", "{"))).status).toBe(400);
    expect(
      (
        await POST(
          req("POST", JSON.stringify({ ...draft, actorId: "spoofed" })),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate(
          req(
            "POST",
            JSON.stringify({
              operationId: draft.operationId,
              expectedRevision: 0,
              kind: "return",
              reason: "QA received",
              rows: [{ lineId: "line-1", received: 1, resellable: 2 }],
            }),
          ),
          props,
        )
      ).status,
    ).toBe(400);
    expect(orders.createOrder).not.toHaveBeenCalled();
    expect(orders.mutateOrder).not.toHaveBeenCalled();
  });

  it("maps stale revision to 409, retaining private headers and cookies", async () => {
    jest
      .mocked(orders.mutateOrder)
      .mockRejectedValue(
        new CatalogOperationError("conflict", "order_conflict"),
      );
    const response = await mutate(
      req(
        "POST",
        JSON.stringify({
          operationId: draft.operationId,
          expectedRevision: 0,
          kind: "confirm",
        }),
      ),
      props,
    );
    expect(response.status).toBe(409);
    expect(response.cookies.get("sb-qa-refresh")?.value).toBe("refreshed");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      type: "conflict",
      message: "order_conflict",
    });
  });

  it("redacts unexpected database errors", async () => {
    const log = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    jest
      .mocked(orders.listOrders)
      .mockRejectedValue(
        new Error("private-name + customer-phone + credentials"),
      );
    const response = await GET(req());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      type: "internal_server_error",
      message: "internal_server_error",
    });
    expect(log).toHaveBeenCalledWith("admin_order_operation_failed");
    log.mockRestore();
  });

  it("validates queries and calls all read/write contracts", async () => {
    jest
      .mocked(orders.listOrders)
      .mockResolvedValue({ orders: [], nextCursor: null });
    jest
      .mocked(orders.searchOrderVariants)
      .mockResolvedValue({ variants: [], nextCursor: null });
    expect((await GET(req())).status).toBe(200);
    expect((await variants(req())).status).toBe(200);
    expect(
      (
        await GET(
          new NextRequest("http://localhost/api/admin/orders?params=bad-json"),
        )
      ).status,
    ).toBe(400);
    jest.mocked(orders.saveOrderDraft).mockResolvedValue({
      orderId: "order-1",
      operationId: draft.operationId,
    });
    expect(
      (
        await save(
          req("PUT", JSON.stringify({ ...draft, expectedRevision: 2 })),
          props,
        )
      ).status,
    ).toBe(200);
    expect(orders.saveOrderDraft).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ expectedRevision: 2 }),
      actor,
    );
  });
});
