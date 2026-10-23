/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import type { AdminUserInvitation, User as BusinessUser } from "@prisma/client";
import { acceptInvitation, pendingInvitation } from "./invitation_acceptance";
import { invitationDeliveryError, invitationOrigin } from "./invitation_errors";
import {
  acceptInvitationSchema,
  userInvitationSchema,
} from "./invitation_schemas";
import { inviteAdminUser } from "./invitation_service";

const mockSend = jest.fn();
const mockGetAuthUser = jest.fn();
const mockRecover = jest.fn();
const mockPrepare = jest.fn();
jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: mockSend,
        getUserById: mockGetAuthUser,
        generateLink: mockPrepare,
      },
      resetPasswordForEmail: mockRecover,
    },
  }),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    adminUserInvitation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    userProfile: { upsert: jest.fn() },
    userPreference: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));
const db = jest.mocked(prisma);
const input = {
  firstName: "Ana",
  lastName: "Ejemplo",
  email: "ana@example.invalid",
  role: "admin" as const,
};
const recipient = {
  id: "auth-invited",
  email: input.email,
  email_confirmed_at: "2026-10-22T00:00:00Z",
};
const passwordClient = { auth: { updateUser: jest.fn() } };
function business(overrides: Partial<BusinessUser> = {}): BusinessUser {
  return {
    id: "business-user",
    email: input.email,
    supabaseAuthUserId: recipient.id,
    role: "customer",
    status: "active",
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
function record(
  overrides: Partial<AdminUserInvitation> = {},
): AdminUserInvitation {
  return {
    id: "invite",
    ...input,
    authUserId: recipient.id,
    invitedById: "super",
    attemptedAt: new Date(0),
    leaseId: null,
    leaseExpiresAt: null,
    sentAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    acceptedAt: null,
    failureCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
beforeEach(() => {
  jest.resetAllMocks();
  process.env.APP_PUBLIC_URL = "https://store.example";
  db.adminUserInvitation.findUnique.mockResolvedValue(null);
  db.adminUserInvitation.create.mockResolvedValue(
    record({ authUserId: null, sentAt: null, expiresAt: null }),
  );
  db.adminUserInvitation.updateMany.mockResolvedValue({ count: 1 });
  db.user.findFirst.mockResolvedValue(null);
  db.user.create.mockResolvedValue(business());
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (callback) => callback(db));
  mockSend.mockResolvedValue({
    data: { user: { id: recipient.id, email: input.email } },
    error: null,
  });
  mockGetAuthUser.mockResolvedValue({
    data: { user: { id: recipient.id, email: input.email } },
    error: null,
  });
  mockRecover.mockResolvedValue({ data: {}, error: null });
  mockPrepare.mockResolvedValue({
    data: { user: { id: recipient.id, email: input.email } },
    error: null,
  });
  passwordClient.auth.updateUser.mockResolvedValue({ error: null });
});
afterEach(() => {
  delete process.env.APP_PUBLIC_URL;
});

it("normalizes addresses and rejects invalid roles and extra privilege fields", () => {
  expect(
    userInvitationSchema.parse({ ...input, email: " ANA@EXAMPLE.INVALID " })
      .email,
  ).toBe(input.email);
  expect(
    userInvitationSchema.safeParse({ ...input, role: "owner" }).success,
  ).toBe(false);
  expect(
    acceptInvitationSchema.safeParse({
      password: "long-password",
      acceptTerms: true,
      role: "super_admin",
    }).success,
  ).toBe(false);
  expect(
    acceptInvitationSchema.safeParse({ password: "short", acceptTerms: true })
      .success,
  ).toBe(false);
  expect(
    acceptInvitationSchema.safeParse({
      password: "long-password",
      acceptTerms: false,
    }).success,
  ).toBe(false);
});
it.each([
  "http://store.example",
  "https://localhost",
  "https://user:secret@store.example",
  "https://store.example/path",
  "https://store.example/?next=elsewhere",
])("rejects untrusted callback origin %s", (origin) => {
  process.env.APP_PUBLIC_URL = origin;
  expect(invitationOrigin).toThrow("invitation_origin_missing");
});
it("sends names but never role in editable metadata and never grants a role on send", async () => {
  await expect(inviteAdminUser(input, "super")).resolves.toEqual({
    email: input.email,
  });
  expect(mockSend).toHaveBeenCalledWith(input.email, {
    data: { first_name: "Ana", last_name: "Ejemplo" },
    redirectTo: "https://store.example/auth/invitacion",
  });
  expect(db.user.create).not.toHaveBeenCalled();
  expect(db.adminUserInvitation.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        authUserId: recipient.id,
        leaseId: null,
        sentAt: expect.any(Date),
      }),
    }),
  );
});
it("does not overwrite an existing business account", async () => {
  db.user.findFirst.mockResolvedValue(
    business({ id: "existing", role: "admin" }),
  );
  await expect(inviteAdminUser(input, "super")).rejects.toThrow(
    "invitation_user_exists",
  );
  expect(mockSend).not.toHaveBeenCalled();
});
it("prevents concurrent/recent attempts before sending again", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  db.adminUserInvitation.updateMany.mockResolvedValue({ count: 0 });
  await expect(inviteAdminUser(input, "super")).rejects.toThrow(
    "invitation_rate_limit",
  );
  expect(mockSend).not.toHaveBeenCalled();
});
it.each([
  ["email_address_not_authorized", "invitation_email_restricted"],
  ["over_email_send_rate_limit", "invitation_rate_limit"],
  ["user_already_exists", "invitation_user_exists"],
  ["unknown", "invitation_delivery_failed"],
])(
  "sanitizes provider error %s without activating the account",
  async (provider, expected) => {
    mockSend.mockResolvedValue({
      data: { user: null },
      error: { code: provider, message: "private provider details" },
    });
    await expect(inviteAdminUser(input, "super")).rejects.toThrow(expected);
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.adminUserInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failureCode: expected }),
      }),
    );
  },
);
it("retains the previous valid send on a failed retry", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  mockSend.mockRejectedValue(new Error("network timeout"));
  await expect(inviteAdminUser(input, "super")).rejects.toThrow(
    "invitation_delivery_failed",
  );
  const final = db.adminUserInvitation.updateMany.mock.calls.at(-1)?.[0]?.data;
  expect(final).not.toHaveProperty("sentAt");
  expect(final).not.toHaveProperty("role");
});
it("can resend password setup after confirmation when activation was abandoned", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  mockGetAuthUser.mockResolvedValue({ data: { user: recipient }, error: null });
  await expect(inviteAdminUser(input, "super")).resolves.toEqual({
    email: input.email,
  });
  expect(mockRecover).toHaveBeenCalledWith(input.email, {
    redirectTo: "https://store.example/auth/invitacion",
  });
  expect(mockSend).not.toHaveBeenCalled();
  expect(db.user.create).not.toHaveBeenCalled();
});
it("never sends recovery to a completed account", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(
    record({ acceptedAt: new Date() }),
  );
  await expect(inviteAdminUser(input, "super")).rejects.toThrow(
    "invitation_user_exists",
  );
  expect(mockRecover).not.toHaveBeenCalled();
});
it("does not claim success when the durable send acknowledgement fails", async () => {
  db.adminUserInvitation.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 })
    .mockResolvedValue({ count: 1 });
  await expect(inviteAdminUser(input, "super")).rejects.toThrow(
    "invitation_changed",
  );
});
it.each([
  { acceptedAt: new Date() },
  { expiresAt: new Date(0) },
  { sentAt: null },
  { email: "other@example.invalid" },
])(
  "rejects consumed, expired, unsent and wrong-recipient invitations: %j",
  async (change) => {
    db.adminUserInvitation.findUnique.mockResolvedValue(record(change));
    await expect(
      acceptInvitation(
        recipient,
        { password: "long-password", acceptTerms: true },
        passwordClient,
      ),
    ).rejects.toThrow("invitation_unavailable");
    expect(passwordClient.auth.updateUser).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  },
);
it("requires verified ownership, not just a session or matching client email", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  await expect(
    pendingInvitation({ ...recipient, email_confirmed_at: undefined }),
  ).rejects.toThrow("invitation_unavailable");
});
it("sets a password before consuming the invitation and activates only the stored role", async () => {
  const invitation = record();
  db.adminUserInvitation.findUnique.mockResolvedValue(invitation);
  await expect(
    acceptInvitation(
      recipient,
      { password: "long-password", acceptTerms: true },
      passwordClient,
    ),
  ).resolves.toEqual({ redirectTo: "/admin" });
  expect(passwordClient.auth.updateUser).toHaveBeenCalledWith({
    password: "long-password",
  });
  expect(db.adminUserInvitation.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        acceptedAt: null,
        updatedAt: invitation.updatedAt,
      }),
    }),
  );
  expect(db.user.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ role: "admin", status: "active" }),
    }),
  );
  expect(db.userPreference.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ acceptedTermsAt: expect.any(Date) }),
    }),
  );
});
it("does not activate if password update fails", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  passwordClient.auth.updateUser.mockResolvedValue({
    error: { code: "weak_password" },
  });
  await expect(
    acceptInvitation(
      recipient,
      { password: "long-password", acceptTerms: true },
      passwordClient,
    ),
  ).rejects.toThrow("invitation_password_failed");
  expect(db.$transaction).not.toHaveBeenCalled();
});
it("allows recovery when the password was saved but the previous database attempt failed", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  passwordClient.auth.updateUser.mockResolvedValue({
    error: { code: "same_password" },
  });
  await expect(
    acceptInvitation(
      recipient,
      { password: "long-password", acceptTerms: true },
      passwordClient,
    ),
  ).resolves.toEqual({ redirectTo: "/admin" });
});
it("does not grant a role after an acceptance CAS conflict", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  db.adminUserInvitation.updateMany.mockResolvedValue({ count: 0 });
  await expect(
    acceptInvitation(
      recipient,
      { password: "long-password", acceptTerms: true },
      passwordClient,
    ),
  ).rejects.toThrow("invitation_changed");
  expect(db.user.create).not.toHaveBeenCalled();
});
it("uses a conditional account update so concurrent role changes cannot be overwritten", async () => {
  db.adminUserInvitation.findUnique.mockResolvedValue(record());
  db.user.findFirst.mockResolvedValue(business());
  db.user.updateMany.mockResolvedValue({ count: 0 });
  await expect(
    acceptInvitation(
      recipient,
      { password: "long-password", acceptTerms: true },
      passwordClient,
    ),
  ).rejects.toThrow("invitation_changed");
  expect(db.user.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        role: "customer",
        supabaseAuthUserId: recipient.id,
      }),
    }),
  );
  expect(db.userProfile.upsert).not.toHaveBeenCalled();
});
it.each(["blocked", "inactive"] as const)(
  "does not activate a manually %s account",
  async (status) => {
    db.adminUserInvitation.findUnique.mockResolvedValue(record());
    db.user.findFirst.mockResolvedValue(business({ status }));
    await expect(
      acceptInvitation(
        recipient,
        { password: "long-password", acceptTerms: true },
        passwordClient,
      ),
    ).rejects.toThrow("invitation_changed");
    expect(db.user.updateMany).not.toHaveBeenCalled();
  },
);
it.each(["admin", "super_admin"] as const)(
  "does not override an existing %s account during acceptance",
  async (role) => {
    db.adminUserInvitation.findUnique.mockResolvedValue(record());
    db.user.findFirst.mockResolvedValue(business({ role }));
    await expect(
      acceptInvitation(
        recipient,
        { password: "long-password", acceptTerms: true },
        passwordClient,
      ),
    ).rejects.toThrow("invitation_changed");
    expect(db.user.create).not.toHaveBeenCalled();
  },
);
it("maps default SMTP's alternate human-readable restriction without leaking it", () => {
  expect(
    invitationDeliveryError({ message: "Email address not authorized" }).code,
  ).toBe("invitation_email_restricted");
});
