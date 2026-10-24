import { isDeletedAccount } from "@/domains/auth/services/deleted_account";
import { sanitizeCurrentUser } from "@/domains/auth/services/sanitize_current_user";
import {
  lockUserAccess,
  lockUserIdentity,
} from "@/domains/auth/services/user_access_lock";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/shared";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import "server-only";
import type { AccountProfileParams } from "../types/api_params";
import type { AccountData } from "../types/api_responses";
import { AccountError } from "./account_errors";

export async function readAccount(user: CurrentUserDto): Promise<AccountData> {
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  if (
    !record ||
    isDeletedAccount(record.email) ||
    record.supabaseAuthUserId !== user.authUserId
  )
    throw new AccountError("unauthorized", 401);
  return {
    user: sanitizeCurrentUser(record),
    phone: record.profile?.phone ?? "",
  };
}

export async function updateAccount(
  user: CurrentUserDto,
  input: AccountProfileParams,
): Promise<AccountData> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    const record = await tx.user.findUnique({ where: { id: user.id } });
    if (!record || record.supabaseAuthUserId !== user.authUserId)
      throw new AccountError("unauthorized", 401);
    if (record.status === "inactive" || record.status === "blocked")
      throw new AccountError("account_disabled", 403);
    await tx.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input, phone: input.phone || null },
      update: { ...input, phone: input.phone || null },
    });
  });
  return readAccount(user);
}

export function createAccountVerifier(): ReturnType<typeof createClient> {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  });
}

export async function withVerifiedPassword<T>(
  user: CurrentUserDto,
  password: string,
  action: (client: ReturnType<typeof createClient>) => Promise<T>,
): Promise<T> {
  const client = createAccountVerifier();
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error?.status === 429)
      throw new AccountError("account_rate_limit", 429);
    if (error || data.user?.id !== user.authUserId || !data.session)
      throw new AccountError("account_password_invalid", 403);
    if (data.user.factors?.some((factor) => factor.status === "verified"))
      throw new AccountError("account_mfa_required", 403);
    return await action(client);
  } finally {
    // The verification session must never become a browser session or survive an error.
    try {
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) console.error("account_verification_cleanup_failed");
    } catch {
      console.error("account_verification_cleanup_failed");
    }
  }
}

export async function removeAccount(user: CurrentUserDto): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await lockUserAccess(tx);
      await lockUserIdentity(tx, user.authUserId);
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const record = await tx.user.findUnique({ where: { id: user.id } });
      if (!record || record.supabaseAuthUserId !== user.authUserId)
        throw new AccountError("unauthorized", 401);
      if (
        record.role === "super_admin" &&
        record.status === "active" &&
        record.emailVerifiedAt
      ) {
        const others = await tx.user.count({
          where: {
            id: { not: user.id },
            role: "super_admin",
            status: "active",
            emailVerifiedAt: { not: null },
          },
        });
        if (!others) throw new AccountError("account_last_superadmin", 409);
      }
      await tx.adminUserInvitation.deleteMany({
        where: {
          OR: [
            { email: record.email.toLowerCase() },
            { authUserId: user.authUserId },
          ],
        },
      });
      // Keep a non-login reference so stale requests cannot recreate the identity.
      await tx.userProfile.deleteMany({ where: { userId: user.id } });
      await tx.userAddress.deleteMany({ where: { userId: user.id } });
      await tx.userPreference.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `${randomUUID()}@deleted.invalid`,
          role: "customer",
          status: "inactive",
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          lastLoginAt: null,
        },
      });
      const { error } = await createSupabaseAdminClient(
        5_000,
      ).auth.admin.deleteUser(user.authUserId, false);
      if (error && error.code !== "user_not_found")
        throw new AccountError("account_delete_failed", 503);
    },
    { timeout: 10_000 },
  );
}
