import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Prisma } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import "server-only";
import type { AdminUserInviteParams } from "../types/api_params";
import type { AdminUserInviteData } from "../types/api_responses";
import {
  InvitationError,
  invitationDeliveryError,
  invitationOrigin,
} from "./invitation_errors";

async function sendInvitation(
  input: AdminUserInviteParams,
  redirectTo: string,
  authUserId?: string | null,
): Promise<User> {
  const client = createSupabaseAdminClient(15_000);
  if (authUserId) {
    const existing = await client.auth.admin.getUserById(authUserId);
    if (
      existing.error ||
      !existing.data.user ||
      existing.data.user.email?.toLowerCase() !== input.email
    )
      throw new InvitationError("invitation_changed", 409);
    if (existing.data.user.email_confirmed_at) {
      // Only an unconsumed, server-owned invitation may use recovery to finish setup.
      const recovered = await client.auth.resetPasswordForEmail(input.email, {
        redirectTo,
      });
      if (recovered.error) throw invitationDeliveryError(recovered.error);
      return existing.data.user;
    }
  }
  const { data, error } = await client.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { first_name: input.firstName, last_name: input.lastName },
      redirectTo,
    },
  );
  if (error) throw invitationDeliveryError(error);
  if (!data.user || data.user.email_confirmed_at)
    throw new InvitationError("invitation_user_exists", 409);
  return data.user;
}

export async function inviteAdminUser(
  input: AdminUserInviteParams,
  actorId: string,
): Promise<AdminUserInviteData> {
  const redirectTo = `${invitationOrigin()}/auth/invitacion`;
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const existing = await prisma.adminUserInvitation.findUnique({
    where: { email },
  });
  const account = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (
    existing?.acceptedAt ||
    (account &&
      (!existing?.authUserId ||
        account.status === "blocked" ||
        account.status === "inactive" ||
        account.supabaseAuthUserId !== existing.authUserId ||
        account.role !== "customer"))
  ) {
    throw new InvitationError("invitation_user_exists", 409);
  }
  const leaseId = randomUUID();
  const lease = {
    leaseId,
    leaseExpiresAt: new Date(now.getTime() + 120_000),
    attemptedAt: now,
    invitedById: actorId,
  };
  let id: string;
  if (existing) {
    const claimed = await prisma.adminUserInvitation.updateMany({
      where: {
        id: existing.id,
        acceptedAt: null,
        attemptedAt: { lte: new Date(now.getTime() - 60_000) },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
      },
      data: lease,
    });
    if (!claimed.count) throw new InvitationError("invitation_rate_limit", 429);
    id = existing.id;
  } else {
    try {
      const record = await prisma.adminUserInvitation.create({
        data: { ...input, email, ...lease },
      });
      id = record.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new InvitationError("invitation_rate_limit", 429);
      throw error;
    }
  }
  try {
    let authUserId = existing?.authUserId;
    if (!authUserId) {
      // Persist the Auth identity before sending. The generated link is discarded.
      const prepared = await createSupabaseAdminClient(
        15_000,
      ).auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { first_name: input.firstName, last_name: input.lastName },
          redirectTo,
        },
      });
      if (prepared.error) throw invitationDeliveryError(prepared.error);
      if (
        !prepared.data.user ||
        prepared.data.user.email?.toLowerCase() !== email ||
        prepared.data.user.email_confirmed_at
      )
        throw new InvitationError("invitation_user_exists", 409);
      authUserId = prepared.data.user.id;
      const bound = await prisma.adminUserInvitation.updateMany({
        where: { id, leaseId, acceptedAt: null },
        data: { authUserId },
      });
      if (!bound.count) throw new InvitationError("invitation_changed", 409);
    }
    const user = await sendInvitation(
      { ...input, email },
      redirectTo,
      authUserId,
    );
    if (
      user.email?.toLowerCase() !== email ||
      (existing?.authUserId && existing.authUserId !== user.id)
    )
      throw new InvitationError("invitation_user_exists", 409);
    const sentAt = new Date();
    const saved = await prisma.adminUserInvitation.updateMany({
      where: { id, leaseId, acceptedAt: null },
      data: {
        ...input,
        email,
        authUserId: user.id,
        sentAt,
        expiresAt: new Date(sentAt.getTime() + 3_600_000),
        leaseId: null,
        leaseExpiresAt: null,
        failureCode: null,
      },
    });
    if (!saved.count) throw new InvitationError("invitation_changed", 409);
    return { email };
  } catch (error) {
    const failure =
      error instanceof InvitationError
        ? error
        : new InvitationError("invitation_delivery_failed", 503);
    await prisma.adminUserInvitation.updateMany({
      where: { id, leaseId },
      data: { leaseId: null, leaseExpiresAt: null, failureCode: failure.code },
    });
    throw failure;
  }
}
