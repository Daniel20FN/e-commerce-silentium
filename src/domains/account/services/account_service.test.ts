/** @jest-environment node */
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import {
  accountDeleteSchema,
  accountPasswordSchema,
  accountProfileSchema,
} from "./account_schemas";
import {
  readAccount,
  removeAccount,
  updateAccount,
  withVerifiedPassword,
} from "./account_service";

jest.mock("server-only", () => ({}));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));
jest.mock("@/lib/supabase/shared", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabasePublishableKey: () => "public-test",
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn(), user: { findUnique: jest.fn() } },
}));
const user: CurrentUserDto = {
  id: "own",
  authUserId: "auth-own",
  email: "ana@example.invalid",
  role: "customer",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "Moreno" },
};
const profile = {
  firstName: "Ana",
  lastName: "Moreno",
  phone: "+57 316 0000000",
};
const record = {
  ...user,
  supabaseAuthUserId: user.authUserId,
  emailVerifiedAt: new Date(),
  profile,
};
const mockTx = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userProfile: { upsert: jest.fn(), deleteMany: jest.fn() },
  userAddress: { deleteMany: jest.fn() },
  userPreference: { deleteMany: jest.fn() },
  adminUserInvitation: { deleteMany: jest.fn() },
};
const mockAuth = { signInWithPassword: jest.fn(), signOut: jest.fn() };
const mockDelete = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Unexpected batch");
    return callback(mockTx as never);
  });
  mockTx.user.findUnique.mockResolvedValue(record);
  mockTx.user.count.mockResolvedValue(1);
  jest.mocked(prisma.user.findUnique).mockResolvedValue(record as never);
  jest.mocked(createClient).mockReturnValue({ auth: mockAuth } as never);
  jest
    .mocked(createSupabaseAdminClient)
    .mockReturnValue({ auth: { admin: { deleteUser: mockDelete } } } as never);
  mockDelete.mockResolvedValue({ error: null });
  mockAuth.signInWithPassword.mockResolvedValue({
    data: {
      user: { id: user.authUserId },
      session: { access_token: "not-a-real-token" },
    },
    error: null,
  });
  mockAuth.signOut.mockResolvedValue({ error: null });
});
it("strictly rejects client-selected identities and roles", () => {
  expect(
    accountProfileSchema.safeParse({ ...profile, role: "super_admin" }).success,
  ).toBe(false);
  expect(
    accountProfileSchema.safeParse({ ...profile, userId: "other" }).success,
  ).toBe(false);
  expect(
    accountDeleteSchema.safeParse({
      currentPassword: "secret",
      confirmationEmail: user.email,
      userId: "other",
    }).success,
  ).toBe(false);
  expect(
    accountPasswordSchema.safeParse({
      currentPassword: "same-pass",
      password: "same-pass",
    }).success,
  ).toBe(false);
  expect(
    accountProfileSchema.safeParse({ ...profile, phone: "garbage" }).success,
  ).toBe(false);
});
it("projects only own public account data and contact phone", async () => {
  const result = await readAccount(user);
  expect(result).toEqual({ user, phone: profile.phone });
  expect(result).not.toHaveProperty("documentNumber");
});
it("rejects a stale or mismatched Auth binding", async () => {
  mockTx.user.findUnique.mockResolvedValue({
    ...record,
    supabaseAuthUserId: "other",
  });
  await expect(updateAccount(user, profile)).rejects.toMatchObject({
    status: 401,
  });
  expect(mockTx.userProfile.upsert).not.toHaveBeenCalled();
});
it.each(["blocked", "inactive"])(
  "does not edit a %s profile",
  async (status) => {
    mockTx.user.findUnique.mockResolvedValue({ ...record, status });
    await expect(updateAccount(user, profile)).rejects.toMatchObject({
      code: "account_disabled",
    });
  },
);
it("saves only owned profile data, never role or verified phone", async () => {
  await updateAccount(user, { ...profile, phone: "" });
  expect(mockTx.userProfile.upsert).toHaveBeenCalledWith({
    where: { userId: user.id },
    create: { userId: user.id, ...profile, phone: null },
    update: { ...profile, phone: null },
  });
  expect(mockTx.user.update).not.toHaveBeenCalled();
});
it("rechecks the password against exactly the current Auth identity", async () => {
  const action = jest.fn().mockResolvedValue("ok");
  await expect(withVerifiedPassword(user, "current", action)).resolves.toBe(
    "ok",
  );
  expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
    email: user.email,
    password: "current",
  });
  expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(createClient).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(String),
    expect.objectContaining({
      auth: expect.objectContaining({ persistSession: false }),
    }),
  );
});
it.each(["wrong-password", "wrong-user", "no-session", "rate-limit"])(
  "refuses %s before sensitive work",
  async (reason) => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: reason === "wrong-user" ? "other" : user.authUserId },
        session: reason === "no-session" ? null : {},
      },
      error:
        reason === "wrong-password"
          ? { status: 400 }
          : reason === "rate-limit"
            ? { status: 429 }
            : null,
    });
    const action = jest.fn();
    await expect(
      withVerifiedPassword(user, "bad", action),
    ).rejects.toMatchObject({
      code:
        reason === "rate-limit"
          ? "account_rate_limit"
          : "account_password_invalid",
    });
    expect(action).not.toHaveBeenCalled();
    expect(mockAuth.signOut).toHaveBeenCalled();
  },
);
it("cleans up the verification session if the sensitive operation fails", async () => {
  await expect(
    withVerifiedPassword(user, "current", async () => {
      throw new Error("failure");
    }),
  ).rejects.toThrow("failure");
  expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
});

it("does not bypass an enrolled second factor using password-only verification", async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: {
      user: { id: user.authUserId, factors: [{ status: "verified" }] },
      session: {},
    },
    error: null,
  });
  const action = jest.fn();
  await expect(
    withVerifiedPassword(user, "current", action),
  ).rejects.toMatchObject({ code: "account_mfa_required" });
  expect(action).not.toHaveBeenCalled();
});
it("prevents the last active verified superadmin deleting their account", async () => {
  mockTx.user.findUnique.mockResolvedValue({ ...record, role: "super_admin" });
  mockTx.user.count.mockResolvedValue(0);
  await expect(removeAccount(user)).rejects.toMatchObject({
    code: "account_last_superadmin",
    status: 409,
  });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockTx.user.update).not.toHaveBeenCalled();
});
it("removes personal data and Auth but retains only a non-login provenance marker", async () => {
  await removeAccount(user);
  expect(mockTx.$executeRaw).toHaveBeenCalled();
  expect(mockTx.userProfile.deleteMany).toHaveBeenCalledWith({
    where: { userId: user.id },
  });
  expect(mockTx.userAddress.deleteMany).toHaveBeenCalledWith({
    where: { userId: user.id },
  });
  expect(mockTx.userPreference.deleteMany).toHaveBeenCalledWith({
    where: { userId: user.id },
  });
  expect(mockTx.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        email: expect.stringMatching(/@deleted\.invalid$/),
        role: "customer",
        status: "inactive",
        emailVerifiedAt: null,
      }),
    }),
  );
  expect(mockDelete).toHaveBeenCalledWith(user.authUserId, false);
  expect(mockTx.user.delete).not.toHaveBeenCalled();
});
it("allows a superadmin to leave when another verified active one exists", async () => {
  mockTx.user.findUnique.mockResolvedValue({ ...record, role: "super_admin" });
  await removeAccount(user);
  expect(mockTx.user.count).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: "active",
        emailVerifiedAt: { not: null },
      }),
    }),
  );
  expect(mockDelete).toHaveBeenCalled();
});
it("rolls back through the transaction on provider failure and does not announce success", async () => {
  mockDelete.mockResolvedValue({ error: { code: "unexpected_failure" } });
  await expect(removeAccount(user)).rejects.toMatchObject({
    code: "account_delete_failed",
  });
});
