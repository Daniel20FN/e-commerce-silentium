jest.mock("server-only", () => ({}));
import { recordLegalDecisions } from "@/domains/legal/services/consent_service";
import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import type { AuthUserRecord } from "./sanitize_current_user";
import { syncAuthUser } from "./sync_auth_user";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    userPreference: {
      upsert: jest.fn(),
    },
  },
}));
jest.mock("@/domains/legal/services/consent_service", () => ({
  recordLegalDecisions: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockUserFindFirst = mockPrisma.user.findFirst as jest.Mock;
const mockUserUpdate = mockPrisma.user.update as jest.Mock;
const mockUserCreate = mockPrisma.user.create as jest.Mock;
const mockUserFindUnique = mockPrisma.user.findUnique as jest.Mock;
const mockUserProfileUpsert = mockPrisma.userProfile.upsert as jest.Mock;
const mockUserPreferenceUpsert = mockPrisma.userPreference.upsert as jest.Mock;

function createSupabaseUser(overrides?: Partial<User>): User {
  return {
    id: "auth-user-1",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-02T00:00:00.000Z",
    email: "cliente@example.com",
    email_confirmed_at: "2026-04-02T00:00:00.000Z",
    last_sign_in_at: "2026-04-02T10:00:00.000Z",
    phone_confirmed_at: null,
    ...overrides,
  } as User;
}

describe("syncAuthUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      if (typeof callback !== "function") throw new Error("Unexpected batch");
      return callback(prisma as never);
    });
  });

  it("passes the actual optional channel decisions to evidence without overwriting them before recording", async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "new-owner" });
    mockUserFindUnique.mockResolvedValue({ id: "new-owner" });
    await syncAuthUser({
      authUser: createSupabaseUser(),
      legalAcceptance: {
        acceptTerms: true,
        acceptPrivacy: true,
        adult: true,
        legalVersion: "2026-10-28.1",
      },
      acceptsMarketingEmails: true,
      acceptsWhatsAppMarketing: false,
    });
    expect(recordLegalDecisions).toHaveBeenCalledWith(
      expect.anything(),
      "new-owner",
      expect.objectContaining({
        acceptsMarketingEmails: true,
        acceptsWhatsAppMarketing: false,
      }),
      "registration",
    );
    expect(mockUserPreferenceUpsert.mock.calls[0][0].update).not.toHaveProperty(
      "acceptsMarketingEmails",
    );
  });

  it("preserves profile edits instead of restoring old signup metadata", async () => {
    const existing = {
      id: "user-1",
      email: "cliente@example.com",
      status: UserStatus.active,
      profile: { firstName: "Diana", lastName: "Moreno" },
    };
    mockUserFindFirst.mockResolvedValue(existing);
    mockUserUpdate.mockResolvedValue(existing);
    mockUserFindUnique.mockResolvedValue(existing);
    await syncAuthUser({
      authUser: createSupabaseUser({
        user_metadata: { first_name: "Old", last_name: "Name" },
      }),
    });
    expect(mockUserProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });
  it("does not revive a deleted account from a previously verified stale session", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "old",
      email: "random@deleted.invalid",
      status: UserStatus.inactive,
    });
    await expect(
      syncAuthUser({ authUser: createSupabaseUser() }),
    ).rejects.toThrow("account_deleted");
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
  });

  it.each([UserStatus.blocked, UserStatus.inactive])(
    "preserves a manually disabled %s account during invitation/session sync",
    async (status) => {
      const existing = {
        id: "user-1",
        status,
        profile: { firstName: "Ana", lastName: "Ejemplo" },
      };
      mockUserFindFirst.mockResolvedValue(existing);
      mockUserUpdate.mockResolvedValue(existing);
      mockUserFindUnique.mockResolvedValue(existing);
      await syncAuthUser({ authUser: createSupabaseUser() });
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status }) }),
      );
    },
  );

  it("creates a linked business user with profile and preferences on first signup", async () => {
    const acceptedTermsAt = new Date("2026-04-02T12:00:00.000Z");
    const syncedUser: AuthUserRecord = {
      id: "user-1",
      supabaseAuthUserId: "auth-user-1",
      email: "cliente@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerifiedAt: new Date("2026-04-02T00:00:00.000Z"),
      phoneVerifiedAt: null,
      lastLoginAt: new Date("2026-04-02T10:00:00.000Z"),
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      profile: {
        userId: "user-1",
        firstName: "Ana",
        lastName: "Pérez",
        phone: null,
        documentType: null,
        documentNumber: null,
        birthDate: null,
        gender: null,
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    };

    mockUserFindFirst.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "user-1" });
    mockUserFindUnique.mockResolvedValue(syncedUser);

    const result = await syncAuthUser({
      authUser: createSupabaseUser({ email: "CLIENTE@example.com" }),
      profile: {
        firstName: " Ana ",
        lastName: " Pérez ",
      },
      acceptedTermsAt,
      acceptsMarketingEmails: true,
      acceptsWhatsAppMarketing: false,
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { supabaseAuthUserId: "auth-user-1" },
          { email: "cliente@example.com" },
        ],
      },
      include: {
        profile: true,
      },
    });
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        email: "cliente@example.com",
        supabaseAuthUserId: "auth-user-1",
        emailVerifiedAt: new Date("2026-04-02T00:00:00.000Z"),
        phoneVerifiedAt: null,
        lastLoginAt: new Date("2026-04-02T10:00:00.000Z"),
        status: UserStatus.active,
      },
    });
    expect(mockUserProfileUpsert).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
      update: {
        firstName: "Ana",
        lastName: "Pérez",
      },
      create: {
        userId: "user-1",
        firstName: "Ana",
        lastName: "Pérez",
      },
    });
    expect(mockUserPreferenceUpsert).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
      update: {
        acceptedTermsAt,

        acceptsMarketingEmails: true,
        acceptsWhatsAppMarketing: false,
      },
      create: {
        userId: "user-1",
        acceptsMarketingEmails: true,
        acceptsWhatsAppMarketing: false,
        acceptedTermsAt,
      },
    });
    expect(result).toBe(syncedUser);
  });

  it("self-heals legacy email-linked users by attaching the Supabase auth id", async () => {
    const existingUser = {
      id: "legacy-user-1",
      profile: {
        firstName: "Ana",
        lastName: "Pérez",
      },
    };
    const syncedUser: AuthUserRecord = {
      id: "legacy-user-1",
      supabaseAuthUserId: "auth-user-2",
      email: "legacy@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerifiedAt: new Date("2026-04-02T00:00:00.000Z"),
      phoneVerifiedAt: null,
      lastLoginAt: new Date("2026-04-02T11:00:00.000Z"),
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T11:00:00.000Z"),
      profile: {
        userId: "legacy-user-1",
        firstName: "Ana",
        lastName: "Pérez",
        phone: null,
        documentType: null,
        documentNumber: null,
        birthDate: null,
        gender: null,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T11:00:00.000Z"),
      },
    };

    mockUserFindFirst.mockResolvedValue(existingUser);
    mockUserUpdate.mockResolvedValue({ id: "legacy-user-1" });
    mockUserFindUnique.mockResolvedValue(syncedUser);

    const result = await syncAuthUser({
      authUser: createSupabaseUser({
        id: "auth-user-2",
        email: "LEGACY@example.com",
        last_sign_in_at: "2026-04-02T11:00:00.000Z",
      }),
    });

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: {
        id: "legacy-user-1",
      },
      data: {
        supabaseAuthUserId: "auth-user-2",
        email: "legacy@example.com",
        emailVerifiedAt: new Date("2026-04-02T00:00:00.000Z"),
        phoneVerifiedAt: null,
        lastLoginAt: new Date("2026-04-02T11:00:00.000Z"),
        status: UserStatus.active,
      },
    });
    expect(mockUserProfileUpsert).not.toHaveBeenCalled();
    expect(mockUserPreferenceUpsert).toHaveBeenCalledWith({
      where: {
        userId: "legacy-user-1",
      },
      update: {},
      create: {
        userId: "legacy-user-1",
        acceptsMarketingEmails: false,
        acceptsWhatsAppMarketing: false,
      },
    });
    expect(result).toBe(syncedUser);
  });
});
