/** @jest-environment node */
import { withVerifiedPassword } from "@/domains/account/services/account_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { POST } from "./route";
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: (_source: unknown, target: unknown) => target,
}));
jest.mock("@/domains/account/services/account_service", () => ({
  withVerifiedPassword: jest.fn(),
}));
const user = {
  id: "own",
  authUserId: "auth-own",
  email: "ana@example.invalid",
  role: "customer",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "M" },
} as const;
const updateUser = jest.fn();
const signOut = jest.fn();
const browserSignOut = jest.fn();
const request = (input: object) =>
  new NextRequest("http://localhost:3000/api/account/password", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveCurrentUser).mockResolvedValue(user);
  jest
    .mocked(createRouteHandlerSupabaseClient)
    .mockReturnValue({ auth: { signOut: browserSignOut } } as never);
  jest
    .mocked(withVerifiedPassword)
    .mockImplementation(async (_user, _password, action) =>
      action({ auth: { updateUser, signOut } } as never),
    );
  updateUser.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
});
it("changes only the verified user's password, then revokes refresh sessions", async () => {
  const result = await POST(
    request({ currentPassword: "current-pass", password: "new-secure-pass" }),
  );
  expect(result.status).toBe(200);
  expect(withVerifiedPassword).toHaveBeenCalledWith(
    user,
    "current-pass",
    expect.any(Function),
  );
  expect(updateUser).toHaveBeenCalledWith({ password: "new-secure-pass" });
  expect(signOut).toHaveBeenCalledWith({ scope: "global" });
  expect(browserSignOut).toHaveBeenCalledWith({ scope: "local" });
});
it("rejects short, unchanged or privilege-bearing input", async () => {
  for (const input of [
    { currentPassword: "current-pass", password: "short" },
    { currentPassword: "same-password", password: "same-password" },
    {
      currentPassword: "current-pass",
      password: "new-secure-pass",
      userId: "other",
    },
  ]) {
    expect((await POST(request(input))).status).toBe(400);
  }
  expect(withVerifiedPassword).not.toHaveBeenCalled();
});
it("does not report success if the provider rejects a new password", async () => {
  updateUser.mockResolvedValue({ error: { code: "weak_password" } });
  expect(
    (
      await POST(
        request({
          currentPassword: "current-pass",
          password: "new-secure-pass",
        }),
      )
    ).status,
  ).toBe(400);
  expect(signOut).not.toHaveBeenCalled();
});
it("does not claim sessions were revoked if global logout fails", async () => {
  signOut.mockResolvedValue({ error: { code: "network_error" } });
  expect(
    (
      await POST(
        request({
          currentPassword: "current-pass",
          password: "new-secure-pass",
        }),
      )
    ).status,
  ).toBe(503);
});
it("denies security changes for disabled accounts", async () => {
  jest
    .mocked(resolveCurrentUser)
    .mockResolvedValue({ ...user, status: "blocked" });
  expect(
    (
      await POST(
        request({
          currentPassword: "current-pass",
          password: "new-secure-pass",
        }),
      )
    ).status,
  ).toBe(403);
  expect(withVerifiedPassword).not.toHaveBeenCalled();
});
