/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { updateAdminUser } from "./admin_user_mutations";
jest.mock("server-only", () => ({}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
const tx = {
  $executeRaw: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Unexpected batch");
    return callback(tx as never);
  });
  const record = {
    id: "own",
    email: "admin@example.invalid",
    role: "super_admin",
    status: "active",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    lastLoginAt: null,
  };
  tx.user.findUniqueOrThrow.mockResolvedValue(record);
  tx.user.findUnique.mockResolvedValue(record);
  tx.user.update.mockResolvedValue(record);
  tx.user.count.mockResolvedValue(0);
});
it.each([
  { role: "admin" as const },
  { status: "blocked" as const },
  { status: "inactive" as const },
])(
  "prevents removing the last verified active superadmin via %o",
  async (input) => {
    await expect(updateAdminUser("own", input, "actor")).rejects.toMatchObject({
      code: "account_last_superadmin",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  },
);
it("permits a permission change only when another responsible superadmin remains", async () => {
  tx.user.count.mockResolvedValue(1);
  await updateAdminUser("own", { role: "admin" }, "actor");
  expect(tx.$executeRaw).toHaveBeenCalled();
  expect(tx.user.update).toHaveBeenCalled();
});
it("cannot reactivate a non-login deletion reference", async () => {
  tx.user.findUniqueOrThrow.mockResolvedValue({
    email: "marker@deleted.invalid",
  });
  await expect(
    updateAdminUser("deleted", { status: "active" }, "actor"),
  ).rejects.toMatchObject({ code: "account_deleted" });
});

it("revalidates the operator after waiting for concurrent privilege changes", async () => {
  tx.user.findUnique.mockResolvedValue({
    role: "admin",
    status: "active",
    emailVerifiedAt: new Date(),
  });
  await expect(
    updateAdminUser("own", { role: "admin" }, "actor"),
  ).rejects.toMatchObject({ status: 403 });
  expect(tx.user.update).not.toHaveBeenCalled();
});
