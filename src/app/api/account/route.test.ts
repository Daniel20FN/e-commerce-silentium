/** @jest-environment node */
import {
  readAccount,
  removeAccount,
  updateAccount,
  withVerifiedPassword,
} from "@/domains/account/services/account_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { DELETE, GET, PATCH } from "./route";
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: (_source: unknown, target: unknown) => target,
}));
jest.mock("@/domains/account/services/account_service", () => ({
  readAccount: jest.fn(),
  updateAccount: jest.fn(),
  removeAccount: jest.fn(),
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
const signOut = jest.fn();
function request(
  method: string,
  input?: object,
  origin = "http://localhost:3000",
) {
  return new NextRequest("http://localhost:3000/api/account", {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveCurrentUser).mockResolvedValue(user);
  jest
    .mocked(createRouteHandlerSupabaseClient)
    .mockReturnValue({ auth: { signOut } } as never);
  jest
    .mocked(withVerifiedPassword)
    .mockImplementation(async (_user, _password, action) =>
      action({} as never),
    );
  jest.mocked(readAccount).mockResolvedValue({ user, phone: "" });
});
it("requires a verified session and returns private no-store data", async () => {
  const result = await GET(request("GET"));
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  jest.mocked(resolveCurrentUser).mockResolvedValue(null);
  expect((await GET(request("GET"))).status).toBe(401);
  expect(readAccount).toHaveBeenCalledTimes(1);
});
it.each(["https://attacker.invalid", "null", ""])(
  "rejects cross-site or missing origin %s before resolving or mutating",
  async (origin) => {
    expect((await DELETE(request("DELETE", {}, origin))).status).toBe(403);
    expect(resolveCurrentUser).not.toHaveBeenCalled();
    expect(removeAccount).not.toHaveBeenCalled();
  },
);
it("cannot select another identity or alter role in the profile payload", async () => {
  expect(
    (
      await PATCH(
        request("PATCH", {
          firstName: "Ana",
          lastName: "M",
          phone: "",
          userId: "other",
          role: "super_admin",
        }),
      )
    ).status,
  ).toBe(400);
  expect(updateAccount).not.toHaveBeenCalled();
});
it("saves only the resolved person's profile", async () => {
  const input = { firstName: "Ana", lastName: "Moreno", phone: "" };
  jest.mocked(updateAccount).mockResolvedValue({ user, phone: "" });
  expect((await PATCH(request("PATCH", input))).status).toBe(200);
  expect(updateAccount).toHaveBeenCalledWith(user, input);
});
it("requires exact email confirmation and password before deletion", async () => {
  expect(
    (
      await DELETE(
        request("DELETE", {
          confirmationEmail: "other@example.invalid",
          currentPassword: "valid",
        }),
      )
    ).status,
  ).toBe(400);
  expect(withVerifiedPassword).not.toHaveBeenCalled();
  expect(
    (
      await DELETE(
        request("DELETE", {
          confirmationEmail: user.email,
          currentPassword: "valid",
        }),
      )
    ).status,
  ).toBe(200);
  expect(withVerifiedPassword).toHaveBeenCalledWith(
    user,
    "valid",
    expect.any(Function),
  );
  expect(removeAccount).toHaveBeenCalledWith(user);
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("sanitizes unexpected backend errors instead of leaking credentials", async () => {
  jest
    .mocked(readAccount)
    .mockRejectedValue(new Error("provider secret details"));
  const response = await GET(request("GET"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret");
});
