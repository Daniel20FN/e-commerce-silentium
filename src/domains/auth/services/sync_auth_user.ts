import { prisma } from "@/lib/prisma";
import { UserStatus } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { isDeletedAccount } from "./deleted_account";
import type { AuthUserRecord } from "./sanitize_current_user";
import { lockUserIdentity } from "./user_access_lock";

interface SyncAuthUserProfileInput {
  firstName?: string | null;
  lastName?: string | null;
}

export interface SyncAuthUserInput {
  authUser: SupabaseAuthUser;
  profile?: SyncAuthUserProfileInput;
  acceptedTermsAt?: Date;
  acceptsMarketingEmails?: boolean;
  acceptsWhatsAppMarketing?: boolean;
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
  existingStatus?: UserStatus;
  emailVerifiedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
}): UserStatus {
  if (
    params.existingStatus === UserStatus.blocked ||
    params.existingStatus === UserStatus.inactive
  )
    return params.existingStatus;
  if (params.emailVerifiedAt && params.firstName && params.lastName) {
    return UserStatus.active;
  }

  return UserStatus.pending_profile;
}

export async function syncAuthUser(
  input: SyncAuthUserInput,
): Promise<AuthUserRecord> {
  return prisma.$transaction(async (tx) => {
    await lockUserIdentity(tx, input.authUser.id);
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

    await tx.$queryRaw`SELECT id FROM "User" WHERE "supabaseAuthUserId" = ${input.authUser.id} OR email = ${email} ORDER BY id FOR UPDATE`;
    const existingUser = await tx.user.findFirst({
      where: {
        OR: [{ supabaseAuthUserId: input.authUser.id }, { email }],
      },
      include: {
        profile: true,
      },
    });

    if (existingUser && isDeletedAccount(existingUser.email))
      throw new Error("account_deleted");
    const user = existingUser
      ? await tx.user.update({
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
              existingStatus: existingUser.status,
              emailVerifiedAt,
              firstName:
                existingUser.profile?.firstName ??
                profileNames.firstName ??
                null,
              lastName:
                existingUser.profile?.lastName ?? profileNames.lastName ?? null,
            }),
          },
        })
      : await tx.user.create({
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
      await tx.userProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          ...(input.profile?.firstName
            ? { firstName: profileNames.firstName }
            : !existingUser?.profile?.firstName
              ? { firstName: profileNames.firstName }
              : {}),
          ...(input.profile?.lastName
            ? { lastName: profileNames.lastName }
            : !existingUser?.profile?.lastName
              ? { lastName: profileNames.lastName }
              : {}),
        },
        create: {
          userId: user.id,
          firstName: profileNames.firstName,
          lastName: profileNames.lastName,
        },
      });
    }

    await tx.userPreference.upsert({
      where: {
        userId: user.id,
      },
      update: {
        ...(input.acceptedTermsAt
          ? {
              acceptedTermsAt: input.acceptedTermsAt,
              acceptedPrivacyPolicyAt: input.acceptedTermsAt,
            }
          : {}),
        ...(input.acceptsMarketingEmails !== undefined
          ? { acceptsMarketingEmails: input.acceptsMarketingEmails }
          : {}),
        ...(input.acceptsWhatsAppMarketing !== undefined
          ? { acceptsWhatsAppMarketing: input.acceptsWhatsAppMarketing }
          : {}),
      },
      create: {
        userId: user.id,
        acceptsMarketingEmails: input.acceptsMarketingEmails ?? false,
        acceptsWhatsAppMarketing: input.acceptsWhatsAppMarketing ?? false,
        ...(input.acceptedTermsAt
          ? {
              acceptedTermsAt: input.acceptedTermsAt,
              acceptedPrivacyPolicyAt: input.acceptedTermsAt,
            }
          : {}),
      },
    });

    const syncedUser = await tx.user.findUnique({
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
  });
}
