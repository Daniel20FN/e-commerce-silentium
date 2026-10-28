import { hasAdminAccess } from "@/domains/admin/services/admin_roles";
import {
  lockUserAccess,
  lockUserIdentity,
} from "@/domains/auth/services/user_access_lock";
import type {
  AcceptInvitationData,
  AcceptInvitationParams,
} from "@/domains/auth/types/invitation_api";
import { recordLegalDecisions } from "@/domains/legal/services/consent_service";
import { LEGAL_VERSION } from "@/domains/legal/services/legal_release";
import { prisma } from "@/lib/prisma";
import type { AdminUserInvitation } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import "server-only";
import { InvitationError } from "./invitation_errors";

type Recipient = Pick<User, "id" | "email" | "email_confirmed_at">;

export async function pendingInvitation(
  recipient: Recipient,
): Promise<AdminUserInvitation> {
  const invitation = await prisma.adminUserInvitation.findUnique({
    where: { authUserId: recipient.id },
  });
  if (
    !recipient.email_confirmed_at ||
    !invitation ||
    invitation.email !== recipient.email?.toLowerCase() ||
    !invitation.sentAt ||
    !invitation.expiresAt ||
    invitation.expiresAt <= new Date() ||
    (invitation.leaseExpiresAt && invitation.leaseExpiresAt > new Date()) ||
    invitation.acceptedAt
  ) {
    throw new InvitationError("invitation_unavailable", 403);
  }
  return invitation;
}

interface PasswordUpdater {
  auth: {
    updateUser: (input: {
      password: string;
    }) => Promise<{ error: { code?: string } | null }>;
  };
}

export async function acceptInvitation(
  recipient: Recipient,
  input: AcceptInvitationParams,
  supabase: PasswordUpdater,
): Promise<AcceptInvitationData> {
  if (
    !input.acceptTerms ||
    !input.acceptPrivacy ||
    !input.adult ||
    input.legalVersion !== LEGAL_VERSION
  )
    throw new InvitationError("invitation_invalid_fields");
  const invitation = await pendingInvitation(recipient);
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });
  // A previous attempt may have saved the password before the database commit failed.
  if (error && error.code !== "same_password")
    throw new InvitationError("invitation_password_failed");
  await prisma.$transaction(async (tx) => {
    await lockUserAccess(tx);
    await lockUserIdentity(tx, recipient.id);
    const now = new Date();
    const consumed = await tx.adminUserInvitation.updateMany({
      where: {
        id: invitation.id,
        updatedAt: invitation.updatedAt,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now, leaseId: null, leaseExpiresAt: null },
    });
    if (!consumed.count) throw new InvitationError("invitation_changed", 409);
    const existing = await tx.user.findFirst({
      where: {
        OR: [{ email: invitation.email }, { supabaseAuthUserId: recipient.id }],
      },
    });
    if (
      existing &&
      (existing.supabaseAuthUserId !== recipient.id ||
        existing.email.toLowerCase() !== invitation.email ||
        existing.role !== "customer" ||
        existing.status === "blocked" ||
        existing.status === "inactive")
    )
      throw new InvitationError("invitation_changed", 409);
    let accountId: string;
    if (existing) {
      const changed = await tx.user.updateMany({
        where: {
          id: existing.id,
          supabaseAuthUserId: recipient.id,
          role: "customer",
          status: { in: ["active", "pending_profile"] },
        },
        data: { role: invitation.role, status: "active", emailVerifiedAt: now },
      });
      if (!changed.count) throw new InvitationError("invitation_changed", 409);
      accountId = existing.id;
    } else {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          supabaseAuthUserId: recipient.id,
          role: invitation.role,
          status: "active",
          emailVerifiedAt: now,
        },
      });
      accountId = created.id;
    }
    await tx.userProfile.upsert({
      where: { userId: accountId },
      create: {
        userId: accountId,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
      },
      update: {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
      },
    });
    await recordLegalDecisions(
      tx,
      accountId,
      {
        ...input,
        acceptsMarketingEmails: false,
        acceptsWhatsAppMarketing: false,
        requestId: `invitation:${invitation.id}`,
      },
      "invitation",
    );
  });
  return { redirectTo: hasAdminAccess(invitation.role) ? "/admin" : "/" };
}
