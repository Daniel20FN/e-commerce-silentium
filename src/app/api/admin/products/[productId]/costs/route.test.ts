/** @jest-environment node */
import {
  CatalogCostError,
  changeCatalogCostState,
  createCatalogCost,
  getCatalogCosts,
  updateCatalogCost,
} from "@/domains/admin/costs/services/cost_service";
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
jest.mock("@/domains/admin/costs/services/cost_service", () => {
  const actual = jest.requireActual<
    typeof import("@/domains/admin/costs/services/cost_service")
  >("@/domains/admin/costs/services/cost_service");
  return {
    ...actual,
    getCatalogCosts: jest.fn(),
    createCatalogCost: jest.fn(),
    updateCatalogCost: jest.fn(),
    changeCatalogCostState: jest.fn(),
  };
});
const user = {
  id: "admin",
  authUserId: "auth",
  email: "qa@example.com",
  role: "admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "QA", lastName: "Admin" },
} satisfies NonNullable<Awaited<ReturnType<typeof resolveCurrentUser>>>;
const data = { items: [], variants: [], summaries: {}, writable: true };
const url = "http://localhost/api/admin/products/p/costs";
const context = { params: Promise.resolve({ productId: "p" }) };
const input = {
  variantId: null,
  name: "Tela",
  description: null,
  amountCents: 100,
};
describe("cost route authorization and contracts", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(resolveCurrentUser).mockResolvedValue(user);
    jest
      .mocked(createRouteHandlerSupabaseClient)
      .mockImplementation((_request, response) => {
        response.cookies.set("refreshed", "ok");
        return {} as ReturnType<typeof createRouteHandlerSupabaseClient>;
      });
    jest.mocked(getCatalogCosts).mockResolvedValue(data);
    jest.mocked(createCatalogCost).mockResolvedValue(data);
    jest.mocked(updateCatalogCost).mockResolvedValue(data);
    jest.mocked(changeCatalogCostState).mockResolvedValue(data);
  });
  it.each([GET, POST, PUT, PATCH])(
    "denies anonymous before any data access",
    async (handler) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue(null);
      const result = await handler(new NextRequest(url), context);
      expect(result.status).toBe(401);
      expect(result.headers.get("Cache-Control")).toContain("no-store");
      expect(getCatalogCosts).not.toHaveBeenCalled();
      expect(createCatalogCost).not.toHaveBeenCalled();
    },
  );
  it.each(["customer", "support"] as const)(
    "denies %s for every method",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
      for (const handler of [GET, POST, PUT, PATCH])
        expect((await handler(new NextRequest(url), context)).status).toBe(403);
    },
  );
  it.each(["admin", "super_admin"] as const)(
    "returns private cost snapshot for %s preserving cookies",
    async (role) => {
      jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
      const result = await GET(new NextRequest(url), context);
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual({ data });
      expect(result.cookies.get("refreshed")?.value).toBe("ok");
      expect(result.headers.get("Cache-Control")).toContain("no-store");
    },
  );
  it("creates scoped validated costs", async () => {
    const result = await POST(
      new NextRequest(url, { method: "POST", body: JSON.stringify(input) }),
      context,
    );
    expect(result.status).toBe(201);
    expect(createCatalogCost).toHaveBeenCalledWith("p", input);
  });
  it.each([
    "{",
    JSON.stringify({ ...input, amountCents: -1 }),
    JSON.stringify({ ...input, productId: "foreign" }),
  ])("rejects invalid or over-posted bodies", async (body) => {
    const result = await POST(
      new NextRequest(url, { method: "POST", body }),
      context,
    );
    expect(result.status).toBe(400);
    expect(createCatalogCost).not.toHaveBeenCalled();
  });
  it("updates and restores through explicit contracts", async () => {
    const revision = "2026-10-19T00:00:00.000Z";
    expect(
      (
        await PUT(
          new NextRequest(url, {
            method: "PUT",
            body: JSON.stringify({ ...input, id: "c", revision }),
          }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await PATCH(
          new NextRequest(url, {
            method: "PATCH",
            body: JSON.stringify({ id: "c", revision, action: "restore" }),
          }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(changeCatalogCostState).toHaveBeenCalledWith("p", {
      id: "c",
      revision,
      action: "restore",
    });
  });
  it.each([
    ["conflict", 409],
    ["not_found", 404],
    ["invalid_state", 422],
  ] as const)("maps %s and keeps refresh cookies", async (type, status) => {
    jest
      .mocked(getCatalogCosts)
      .mockRejectedValue(new CatalogCostError(type, "cost_conflict"));
    const result = await GET(new NextRequest(url), context);
    expect(result.status).toBe(status);
    expect(result.cookies.get("refreshed")?.value).toBe("ok");
  });
});
