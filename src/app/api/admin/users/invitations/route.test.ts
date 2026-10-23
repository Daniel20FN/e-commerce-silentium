/** @jest-environment node */
import { InvitationError } from "@/domains/admin/users/services/invitation_errors";
import { inviteAdminUser } from "@/domains/admin/users/services/invitation_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/domains/admin/users/services/invitation_service", () => ({
  inviteAdminUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: (_source: NextResponse, target: NextResponse) =>
    target,
}));
const actor: CurrentUserDto = {
  id: "super",
  authUserId: "super-auth",
  email: "super@example.invalid",
  role: "super_admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Super", lastName: "Admin" },
};
const input = {
  firstName: "Ana",
  lastName: "Ejemplo",
  email: " ANA@EXAMPLE.INVALID ",
  role: "admin",
};
function request(body = input, origin = "http://localhost"): NextRequest {
  return new NextRequest("http://localhost/api/admin/users/invitations", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveCurrentUser).mockResolvedValue(actor);
  jest
    .mocked(inviteAdminUser)
    .mockResolvedValue({ email: "ana@example.invalid" });
});
it("allows only a verified active superadmin to send, using the normalized contract", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(inviteAdminUser).toHaveBeenCalledWith(
    { ...input, email: "ana@example.invalid" },
    "super",
  );
  await expect(response.json()).resolves.toEqual({
    data: { email: "ana@example.invalid" },
  });
});
it.each(["admin", "support", "customer"] as const)(
  "denies %s before any mail operation",
  async (role) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...actor, role });
    expect((await POST(request())).status).toBe(403);
    expect(inviteAdminUser).not.toHaveBeenCalled();
  },
);
it.each(["blocked", "inactive", "pending_profile"] as const)(
  "denies a %s superadmin",
  async (status) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...actor, status });
    expect((await POST(request())).status).toBe(403);
  },
);
it("denies anonymous and unverified sessions", async () => {
  jest.mocked(resolveCurrentUser).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  jest
    .mocked(resolveCurrentUser)
    .mockResolvedValue({ ...actor, emailVerified: false });
  expect((await POST(request())).status).toBe(403);
  expect(inviteAdminUser).not.toHaveBeenCalled();
});
it("denies cross-site requests and invalid payloads", async () => {
  expect((await POST(request(input, "https://evil.invalid"))).status).toBe(403);
  expect(resolveCurrentUser).not.toHaveBeenCalled();
  expect((await POST(request({ ...input, role: "owner" }))).status).toBe(400);
  expect(inviteAdminUser).not.toHaveBeenCalled();
});
it("exposes the actionable default mail restriction, not a false success", async () => {
  jest
    .mocked(inviteAdminUser)
    .mockRejectedValue(new InvitationError("invitation_email_restricted", 503));
  const response = await POST(request());
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({
    type: "service_unavailable",
    message: "invitation_email_restricted",
  });
});
