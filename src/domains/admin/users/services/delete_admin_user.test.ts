/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { deleteAdminUser } from "./delete_admin_user";

jest.mock("server-only", () => ({}));
const mockAuthDelete = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { deleteUser: mockAuthDelete } },
  }),
}));
const tx = {
  $queryRaw: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    delete: jest.fn(),
  },
  adminUserInvitation: { count: jest.fn(), deleteMany: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function")
      throw new Error("Unexpected batch transaction");
    // The test double implements only methods exercised by this service.
    return callback(tx as never);
  });
  tx.$queryRaw.mockResolvedValue([{ id: "target" }]);
  tx.user.findUnique.mockResolvedValue({
    id: "actor",
    role: "super_admin",
    status: "active",
    emailVerifiedAt: new Date(),
  });
  tx.user.findUniqueOrThrow.mockResolvedValue({
    id: "target",
    email: "ana@example.invalid",
    supabaseAuthUserId: "auth-target",
  });
  tx.adminUserInvitation.count.mockResolvedValue(0);
  mockAuthDelete.mockResolvedValue({ error: null });
});
it("rejects self deletion before touching either system", async () => {
  await expect(deleteAdminUser("actor", "actor")).rejects.toMatchObject({
    code: "self",
  });
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(mockAuthDelete).not.toHaveBeenCalled();
});
it("locks and removes local identity before deleting Auth last", async () => {
  await deleteAdminUser("target", "actor");
  expect(tx.$queryRaw).toHaveBeenCalled();
  expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "target" } });
  expect(mockAuthDelete).toHaveBeenCalledWith("auth-target", false);
  expect(tx.user.delete.mock.invocationCallOrder[0]).toBeLessThan(
    mockAuthDelete.mock.invocationCallOrder[0],
  );
  expect(tx.adminUserInvitation.deleteMany).toHaveBeenCalledWith({
    where: {
      OR: [{ email: "ana@example.invalid" }, { authUserId: "auth-target" }],
    },
  });
});
it("preserves invitation provenance by refusing referenced inviters", async () => {
  tx.adminUserInvitation.count.mockResolvedValue(1);
  await expect(deleteAdminUser("target", "actor")).rejects.toMatchObject({
    code: "history",
  });
  expect(tx.user.delete).not.toHaveBeenCalled();
  expect(mockAuthDelete).not.toHaveBeenCalled();
});
it("does not contact Auth for a missing account", async () => {
  tx.$queryRaw.mockResolvedValue([]);
  await expect(deleteAdminUser("missing", "actor")).rejects.toMatchObject({
    code: "missing",
  });
  expect(mockAuthDelete).not.toHaveBeenCalled();
});
it("revalidates the actor under row locks before deleting another superadmin", async () => {
  tx.user.findUnique.mockResolvedValue(null);
  await expect(deleteAdminUser("target", "actor")).rejects.toMatchObject({
    code: "forbidden",
  });
  expect(mockAuthDelete).not.toHaveBeenCalled();
  expect(tx.user.delete).not.toHaveBeenCalled();
});
it("throws on provider failure so local deletion rolls back", async () => {
  mockAuthDelete.mockResolvedValue({ error: { code: "unexpected_failure" } });
  await expect(deleteAdminUser("target", "actor")).rejects.toMatchObject({
    code: "provider",
  });
});
it("allows repair after Auth deletion succeeded but local commit failed", async () => {
  mockAuthDelete.mockResolvedValue({ error: { code: "user_not_found" } });
  await expect(deleteAdminUser("target", "actor")).resolves.toBeUndefined();
});
it("supports legacy accounts without an Auth binding", async () => {
  tx.user.findUniqueOrThrow.mockResolvedValue({
    id: "target",
    email: "ana@example.invalid",
    supabaseAuthUserId: null,
  });
  await deleteAdminUser("target", "actor");
  expect(mockAuthDelete).not.toHaveBeenCalled();
});
