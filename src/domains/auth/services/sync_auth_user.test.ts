import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import type { AuthUserRecord } from "./sanitize_current_user";
import { syncAuthUser } from "./sync_auth_user";

jest.mock("@/lib/prisma", () => ({
  prisma: {
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
  });

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
        acceptedPrivacyPolicyAt: acceptedTermsAt,
      },
      create: {
        userId: "user-1",
        acceptedTermsAt,
        acceptedPrivacyPolicyAt: acceptedTermsAt,
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
      },
    });
    expect(result).toBe(syncedUser);
  });
});
