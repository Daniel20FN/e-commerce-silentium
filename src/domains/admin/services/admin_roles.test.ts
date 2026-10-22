import { canAccessAdmin, canManageUsers, hasAdminAccess } from "./admin_roles";

describe("admin role access", () => {
  it("reserves user management for super admins", () => {
    expect(canManageUsers({ role: "super_admin" })).toBe(true);
    for (const role of ["admin", "support", "customer"] as const) {
      expect(canManageUsers({ role })).toBe(false);
    }
    expect(canManageUsers(null)).toBe(false);
  });
  it("allows admin and super admin roles", () => {
    expect(hasAdminAccess("admin")).toBe(true);
    expect(hasAdminAccess("super_admin")).toBe(true);
  });

  it("rejects non admin roles and anonymous users", () => {
    expect(hasAdminAccess("customer")).toBe(false);
    expect(hasAdminAccess("support")).toBe(false);
    expect(
      canAccessAdmin({
        id: "user-1",
        authUserId: "auth-user-1",
        email: "customer@example.com",
        role: "customer",
        status: "active",
        emailVerified: true,
        profile: {
          firstName: "Ada",
          lastName: "Lovelace",
        },
      }),
    ).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });
});
