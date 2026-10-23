/** @jest-environment node */
import {
  acceptInvitation,
  pendingInvitation,
} from "@/domains/admin/users/services/invitation_acceptance";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";

const mockGetUser = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: () => ({ auth: { getUser: mockGetUser } }),
  copySupabaseResponseCookies: (_source: NextResponse, target: NextResponse) =>
    target,
}));
jest.mock("@/domains/admin/users/services/invitation_acceptance", () => ({
  pendingInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
}));
const recipient = {
  id: "recipient",
  email: "invited@example.invalid",
  email_confirmed_at: "2026-10-22T00:00:00Z",
};
function request(
  body: object = { password: "long-password", acceptTerms: true },
): NextRequest {
  return new NextRequest("http://localhost/api/auth/invitations", {
    method: "POST",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: recipient }, error: null });
});
it("returns only recipient-facing fields, never stored role, lease or token", async () => {
  jest.mocked(pendingInvitation).mockResolvedValue({
    id: "invitation",
    lastName: "Ejemplo",
    authUserId: recipient.id,
    invitedById: "super",
    attemptedAt: new Date(),
    leaseExpiresAt: new Date(),
    sentAt: new Date(),
    expiresAt: new Date(),
    acceptedAt: null,
    failureCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    firstName: "Ana",
    email: recipient.email,
    role: "super_admin",
    leaseId: "private",
  });
  const response = await GET(
    new NextRequest("http://localhost/api/auth/invitations"),
  );
  await expect(response.json()).resolves.toEqual({
    data: { firstName: "Ana", email: recipient.email },
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("requires authenticated ownership before lookup or password changes", async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await GET(request())).status).toBe(401);
  expect((await POST(request())).status).toBe(401);
  expect(pendingInvitation).not.toHaveBeenCalled();
  expect(acceptInvitation).not.toHaveBeenCalled();
});
it.each([
  { password: "short", acceptTerms: true },
  { password: "long-password", acceptTerms: false },
  { password: "long-password", acceptTerms: true, role: "super_admin" },
])(
  "rejects invalid password, missing consent and client privilege claims: %j",
  async (input) => {
    expect((await POST(request(input))).status).toBe(400);
    expect(acceptInvitation).not.toHaveBeenCalled();
  },
);
it("passes only the verified identity and password/consent to acceptance", async () => {
  jest.mocked(acceptInvitation).mockResolvedValue({ redirectTo: "/admin" });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(acceptInvitation).toHaveBeenCalledWith(
    recipient,
    { password: "long-password", acceptTerms: true },
    expect.anything(),
  );
  await expect(response.json()).resolves.toEqual({
    data: { redirectTo: "/admin" },
  });
});
