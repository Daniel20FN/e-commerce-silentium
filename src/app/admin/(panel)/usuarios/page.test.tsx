/** @jest-environment node */
import { requireSuperAdminUser } from "@/domains/admin/services/require_admin_user";
import { getAdminUserDetail } from "@/domains/admin/users/services/admin_user_queries";
import AdminUserDetailPage from "./[userId]/page";
import AdminUsersRoutePage from "./page";

jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireSuperAdminUser: jest.fn(),
}));
jest.mock("@/domains/admin/users/services/admin_user_queries", () => ({
  getAdminUserDetail: jest.fn(),
}));
jest.mock("@/domains/admin/users/components/admin_users_page", () => ({
  AdminUsersPage: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
});
it("guards the user list before rendering it", async () => {
  jest.mocked(requireSuperAdminUser).mockRejectedValue(new Error("forbidden"));
  await expect(AdminUsersRoutePage()).rejects.toThrow("forbidden");
  expect(requireSuperAdminUser).toHaveBeenCalledWith("/admin/usuarios");
});
it("guards direct user detail URLs before querying private data", async () => {
  jest.mocked(requireSuperAdminUser).mockRejectedValue(new Error("forbidden"));
  await expect(
    AdminUserDetailPage({
      params: Promise.resolve({ userId: "private-user" }),
    }),
  ).rejects.toThrow("forbidden");
  expect(requireSuperAdminUser).toHaveBeenCalledWith(
    "/admin/usuarios/private-user",
  );
  expect(getAdminUserDetail).not.toHaveBeenCalled();
});
