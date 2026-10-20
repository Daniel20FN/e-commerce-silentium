/** @jest-environment node */
import { publicationReport } from "@/domains/admin/products/__fixtures__/publication";
import { getProductPublication } from "@/domains/admin/products/services/publication_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
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
jest.mock("@/domains/admin/products/services/publication_service", () => ({
  getProductPublication: jest.fn(),
}));
const current = jest.mocked(resolveCurrentUser),
  report = jest.mocked(getProductPublication);
const admin = {
  id: "admin",
  authUserId: "admin",
  email: "qa@example.com",
  role: UserRole.super_admin,
  status: UserStatus.active,
  emailVerified: true,
  profile: { firstName: "QA", lastName: null },
};
const request = () =>
  new NextRequest("http://localhost/api/admin/products/qa/publication");
const params = { params: Promise.resolve({ productId: "qa" }) };
beforeEach(() => {
  jest.clearAllMocks();
  current.mockResolvedValue(admin);
  report.mockResolvedValue(publicationReport);
});
it("returns an authorized report with private no-store and refreshed cookies", async () => {
  const response = await GET(request(), params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.cookies.get("qa-refresh")?.value).toBe("refreshed");
  expect(await response.json()).toEqual({
    data: { report: publicationReport },
  });
});
it.each([null, { ...admin, role: UserRole.customer }])(
  "rejects unauthorized readers without querying private data",
  async (user) => {
    current.mockResolvedValue(user);
    const response = await GET(request(), params);
    expect([401, 403]).toContain(response.status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(report).not.toHaveBeenCalled();
  },
);
it("returns missing/error states without leaking server details or caching them", async () => {
  report
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error("PRIVATE_DB_SECRET"));
  expect((await GET(request(), params)).status).toBe(404);
  const error = await GET(request(), params);
  expect(error.status).toBe(500);
  expect(await error.text()).not.toContain("PRIVATE_DB_SECRET");
  expect(error.headers.get("Cache-Control")).toBe("private, no-store");
});
