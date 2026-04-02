import { UserRole, UserStatus } from "@prisma/client";
import { sanitizeCurrentUser } from "./sanitize_current_user";

describe("sanitizeCurrentUser", () => {
  it("returns a safe current user dto", () => {
    const result = sanitizeCurrentUser({
      id: "user_1",
      supabaseAuthUserId: "auth_1",
      email: "cliente@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerifiedAt: new Date("2026-04-01T10:00:00.000Z"),
      phoneVerifiedAt: null,
      lastLoginAt: null,
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-01T10:00:00.000Z"),
      profile: {
        userId: "user_1",
        firstName: "Ana",
        lastName: "Pérez",
        phone: null,
        documentType: null,
        documentNumber: null,
        birthDate: null,
        gender: null,
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T10:00:00.000Z"),
      },
    });

    expect(result).toEqual({
      id: "user_1",
      authUserId: "auth_1",
      email: "cliente@example.com",
      role: UserRole.customer,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ana",
        lastName: "Pérez",
      },
    });
  });
});
