/** @jest-environment node */
import { deleteAdminUser } from "@/domains/admin/users/services/delete_admin_user";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
jest.mock("server-only", () => ({}));
jest.mock("@/domains/admin/users/services/delete_admin_user", () => ({
  deleteAdminUser: jest.fn(),
  UserDeletionError: class extends Error {},
}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: (_source: Response, target: Response) => target,
}));
const actor: CurrentUserDto = {
  id: "actor",
  authUserId: "auth-actor",
  email: "owner@example.invalid",
  role: "super_admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "A", lastName: "B" },
};
function request(origin = "http://localhost") {
  return new NextRequest("http://localhost/api/admin/users/target", {
    method: "DELETE",
    headers: { origin },
  });
}
const params = { params: Promise.resolve({ userId: "target" }) };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveCurrentUser).mockResolvedValue(actor);
});
it.each(["admin", "customer", "support"] as const)(
  "denies %s",
  async (role) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...actor, role });
    expect((await DELETE(request(), params)).status).toBe(403);
    expect(deleteAdminUser).not.toHaveBeenCalled();
  },
);
it.each(["blocked", "inactive", "pending_profile"] as const)(
  "denies %s superadmins",
  async (status) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...actor, status });
    expect((await DELETE(request(), params)).status).toBe(403);
    expect(deleteAdminUser).not.toHaveBeenCalled();
  },
);
it("denies unverified superadmins", async () => {
  jest
    .mocked(resolveCurrentUser)
    .mockResolvedValue({ ...actor, emailVerified: false });
  expect((await DELETE(request(), params)).status).toBe(403);
});
it("requires authentication", async () => {
  jest.mocked(resolveCurrentUser).mockResolvedValue(null);
  expect((await DELETE(request(), params)).status).toBe(401);
});
it("rejects cross-origin requests before authentication", async () => {
  expect((await DELETE(request("https://evil.invalid"), params)).status).toBe(
    403,
  );
  expect(resolveCurrentUser).not.toHaveBeenCalled();
});
it("deletes only for an active verified superadmin", async () => {
  const response = await DELETE(request(), params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ data: { deletedId: "target" } });
  expect(deleteAdminUser).toHaveBeenCalledWith("target", "actor");
});
