import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AccountError } from "@/domains/account/services/account_errors";
import { lockUserIdentity } from "@/domains/auth/services/user_access_lock";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import "server-only";
import type {
  LegalPreferencesData,
  LegalPreferencesParams,
} from "../types/api_params";
import { LEGAL_VERSION } from "./legal_release";

export function legalSnapshot(): { content: string; hash: string } {
  const copy = getDictionary("es").legal;
  const content = JSON.stringify({
    locale: "es-CO",
    version: LEGAL_VERSION,
    documents: copy.documents,
    controls: copy.controls,
  });
  return { content, hash: createHash("sha256").update(content).digest("hex") };
}

export async function recordLegalDecisions(
  tx: Prisma.TransactionClient,
  userId: string,
  input: LegalPreferencesParams,
  source: "registration" | "invitation" | "account",
): Promise<void> {
  if (input.legalVersion !== LEGAL_VERSION)
    throw new AccountError("legal_version_changed", 409);
  if (
    (input.acceptTerms || input.acceptPrivacy || input.adult) &&
    !(input.acceptTerms && input.acceptPrivacy && input.adult)
  )
    throw new AccountError("legal_acceptance_required");
  const snapshot = legalSnapshot();
  await tx.legalRelease.createMany({
    data: [{ version: LEGAL_VERSION, ...snapshot }],
    skipDuplicates: true,
  });
  const release = await tx.legalRelease.findUniqueOrThrow({
    where: { version: LEGAL_VERSION },
  });
  if (release.hash !== snapshot.hash || release.content !== snapshot.content)
    throw new AccountError("legal_version_changed", 409);
  const choices = {
    ...(input.acceptTerms && input.acceptPrivacy && input.adult
      ? { terms: true, privacy: true, adult: true }
      : {}),
    email: input.acceptsMarketingEmails,
    whatsapp: input.acceptsWhatsAppMarketing,
  };
  const previous = await tx.legalConsentEvent.findMany({
    where: { userId, requestId: input.requestId },
  });
  if (previous.length) {
    if (
      previous.length !== Object.keys(choices).length ||
      previous.some(
        (event) =>
          event.version !== LEGAL_VERSION ||
          event.source !== source ||
          !(event.purpose in choices) ||
          (event.action === "accepted") !==
            Object.entries(choices).find(
              ([purpose]) => purpose === event.purpose,
            )?.[1],
      )
    )
      throw new AccountError("legal_request_changed", 409);
    return;
  }
  if (
    !input.acceptPrivacy &&
    (input.acceptsMarketingEmails || input.acceptsWhatsAppMarketing)
  ) {
    const authorized = await tx.legalConsentEvent.findFirst({
      where: {
        userId,
        version: LEGAL_VERSION,
        purpose: "privacy",
        action: "accepted",
      },
    });
    if (!authorized) throw new AccountError("legal_acceptance_required");
  }
  const preferences = await tx.userPreference.findUnique({ where: { userId } });
  await tx.legalConsentEvent.createMany({
    data: Object.entries(choices).map(([purpose, accepted]) => ({
      userId,
      version: LEGAL_VERSION,
      purpose,
      source,
      requestId: input.requestId,
      action: accepted
        ? "accepted"
        : (
              purpose === "email"
                ? preferences?.acceptsMarketingEmails
                : preferences?.acceptsWhatsAppMarketing
            )
          ? "withdrawn"
          : "declined",
    })),
  });
  const now = new Date();
  await tx.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      acceptsMarketingEmails: input.acceptsMarketingEmails,
      acceptsWhatsAppMarketing: input.acceptsWhatsAppMarketing,
      ...(input.acceptTerms
        ? { acceptedTermsAt: now, acceptedPrivacyPolicyAt: now }
        : {}),
    },
    update: {
      acceptsMarketingEmails: input.acceptsMarketingEmails,
      acceptsWhatsAppMarketing: input.acceptsWhatsAppMarketing,
      ...(input.acceptTerms
        ? { acceptedTermsAt: now, acceptedPrivacyPolicyAt: now }
        : {}),
    },
  });
}

export async function readLegalPreferences(
  userId: string,
): Promise<LegalPreferencesData> {
  const [preference, events] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.legalConsentEvent.findMany({
      where: {
        userId,
        version: LEGAL_VERSION,
        action: "accepted",
        purpose: { in: ["terms", "privacy", "adult"] },
      },
      select: { purpose: true },
    }),
  ]);
  return {
    acceptsMarketingEmails: preference?.acceptsMarketingEmails ?? false,
    acceptsWhatsAppMarketing: preference?.acceptsWhatsAppMarketing ?? false,
    currentAccepted: new Set(events.map((event) => event.purpose)).size === 3,
  };
}

export async function saveLegalPreferences(
  user: CurrentUserDto,
  input: LegalPreferencesParams,
): Promise<LegalPreferencesData> {
  await prisma.$transaction(async (tx) => {
    await lockUserIdentity(tx, user.authUserId);
    const record = await tx.user.findUnique({ where: { id: user.id } });
    if (
      !record ||
      record.supabaseAuthUserId !== user.authUserId ||
      !["active", "pending_profile"].includes(record.status)
    )
      throw new AccountError("forbidden", 403);
    await recordLegalDecisions(tx, user.id, input, "account");
  });
  return readLegalPreferences(user.id);
}
