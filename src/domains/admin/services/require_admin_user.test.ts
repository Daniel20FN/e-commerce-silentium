/** @jest-environment node */
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requireAdminUser, requireSuperAdminUser } from "./require_admin_user";

jest.mock("server-only", () => ({}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(url);
  }),
}));

const user: CurrentUserDto = {
  id: "actor",
  authUserId: "auth-actor",
  email: "actor@example.invalid",
  role: "super_admin",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ada", lastName: "Admin" },
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createServerSupabaseClient).mockResolvedValue({ auth: {} });
});

it.each(["admin", "super_admin"] as const)(
  "preserves operational access for %s",
  async (role) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
    await expect(requireAdminUser()).resolves.toMatchObject({ role });
    expect(redirect).not.toHaveBeenCalled();
  },
);
it("allows super admins to manage users", async () => {
  jest.mocked(resolveCurrentUser).mockResolvedValue(user);
  await expect(requireSuperAdminUser()).resolves.toEqual(user);
});
it.each(["admin", "support", "customer"] as const)(
  "denies user pages for %s",
  async (role) => {
    jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role });
    await expect(requireSuperAdminUser()).rejects.toThrow("/admin/forbidden");
  },
);
it("sends anonymous users to login preserving their destination", async () => {
  jest.mocked(resolveCurrentUser).mockResolvedValue(null);
  await expect(requireSuperAdminUser("/admin/usuarios/user-1")).rejects.toThrow(
    "/login",
  );
  expect(redirect).toHaveBeenCalledWith(
    expect.stringContaining(encodeURIComponent("/admin/usuarios/user-1")),
  );
});
