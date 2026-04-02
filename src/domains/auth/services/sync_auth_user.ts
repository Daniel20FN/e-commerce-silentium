import { prisma } from "@/lib/prisma";
import { UserStatus } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { AuthUserRecord } from "./sanitize_current_user";

interface SyncAuthUserProfileInput {
  firstName?: string | null;
  lastName?: string | null;
}

export interface SyncAuthUserInput {
  authUser: SupabaseAuthUser;
  profile?: SyncAuthUserProfileInput;
  acceptedTermsAt?: Date;
}

function normalizeName(value?: string | null): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function resolveMetadataRecord(
  metadata: unknown,
): Record<string, string | undefined> {
  if (typeof metadata !== "object" || metadata === null) {
    return {};
  }

  const entries = Object.entries(metadata);

  return entries.reduce<Record<string, string | undefined>>(
    (acc, [key, value]) => {
      acc[key] = typeof value === "string" ? value : undefined;
      return acc;
    },
    {},
  );
}

function resolveProfileNames(input: SyncAuthUserInput): {
  firstName: string | null;
  lastName: string | null;
} {
  const metadata = resolveMetadataRecord(input.authUser.user_metadata);

  return {
    firstName:
      normalizeName(input.profile?.firstName) ??
      normalizeName(metadata.first_name) ??
      normalizeName(metadata.firstName),
    lastName:
      normalizeName(input.profile?.lastName) ??
      normalizeName(metadata.last_name) ??
      normalizeName(metadata.lastName),
  };
}

function resolveUserStatus(params: {
  emailVerifiedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
}): UserStatus {
  if (params.emailVerifiedAt && params.firstName && params.lastName) {
    return UserStatus.active;
  }

  return UserStatus.pending_profile;
}

export async function syncAuthUser(
  input: SyncAuthUserInput,
): Promise<AuthUserRecord> {
  const email = input.authUser.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("Cannot sync auth user without email");
  }

  const emailVerifiedAt = input.authUser.email_confirmed_at
    ? new Date(input.authUser.email_confirmed_at)
    : null;
  const phoneVerifiedAt = input.authUser.phone_confirmed_at
    ? new Date(input.authUser.phone_confirmed_at)
    : null;
  const lastLoginAt = input.authUser.last_sign_in_at
    ? new Date(input.authUser.last_sign_in_at)
    : new Date();
  const profileNames = resolveProfileNames(input);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ supabaseAuthUserId: input.authUser.id }, { email }],
    },
    include: {
      profile: true,
    },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          supabaseAuthUserId: input.authUser.id,
          email,
          emailVerifiedAt,
          phoneVerifiedAt,
          lastLoginAt,
          status: resolveUserStatus({
            emailVerifiedAt,
            firstName:
              profileNames.firstName ?? existingUser.profile?.firstName ?? null,
            lastName:
              profileNames.lastName ?? existingUser.profile?.lastName ?? null,
          }),
        },
      })
    : await prisma.user.create({
        data: {
          email,
          supabaseAuthUserId: input.authUser.id,
          emailVerifiedAt,
          phoneVerifiedAt,
          lastLoginAt,
          status: resolveUserStatus({
            emailVerifiedAt,
            firstName: profileNames.firstName,
            lastName: profileNames.lastName,
          }),
        },
      });

  if (profileNames.firstName && profileNames.lastName) {
    await prisma.userProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        firstName: profileNames.firstName,
        lastName: profileNames.lastName,
      },
      create: {
        userId: user.id,
        firstName: profileNames.firstName,
        lastName: profileNames.lastName,
      },
    });
  }

  await prisma.userPreference.upsert({
    where: {
      userId: user.id,
    },
    update: input.acceptedTermsAt
      ? {
          acceptedTermsAt: input.acceptedTermsAt,
          acceptedPrivacyPolicyAt: input.acceptedTermsAt,
        }
      : {},
    create: {
      userId: user.id,
      ...(input.acceptedTermsAt
        ? {
            acceptedTermsAt: input.acceptedTermsAt,
            acceptedPrivacyPolicyAt: input.acceptedTermsAt,
          }
        : {}),
    },
  });

  const syncedUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      profile: true,
    },
  });

  if (!syncedUser) {
    throw new Error("Failed to resolve synced business user");
  }

  return syncedUser;
}
