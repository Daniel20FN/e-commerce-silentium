import type { Prisma } from "@prisma/client";
import type { CurrentUserDto } from "../types/current_user";

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
}>;

export function sanitizeCurrentUser(user: AuthUserRecord): CurrentUserDto {
  if (!user.supabaseAuthUserId) {
    throw new Error("Cannot sanitize a user without supabaseAuthUserId");
  }

  return {
    id: user.id,
    authUserId: user.supabaseAuthUserId,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    profile: {
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
    },
  };
}
