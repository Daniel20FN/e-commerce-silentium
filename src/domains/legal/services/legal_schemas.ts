import { z } from "zod";
import { LEGAL_VERSION } from "./legal_release";

export const legalAcceptanceShape = {
  acceptTerms: z.literal(true, { error: "legal_acceptance_required" }),
  acceptPrivacy: z.literal(true, { error: "legal_acceptance_required" }),
  adult: z.literal(true, { error: "legal_acceptance_required" }),
  legalVersion: z.literal(LEGAL_VERSION, { error: "legal_version_changed" }),
};
export const legalPreferencesSchema = z
  .object({
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
    adult: z.boolean(),
    legalVersion: z.literal(LEGAL_VERSION),
    acceptsMarketingEmails: z.boolean(),
    acceptsWhatsAppMarketing: z.boolean(),
    requestId: z.uuid(),
  })
  .strict()
  .refine(
    (data) =>
      (data.acceptTerms && data.acceptPrivacy && data.adult) ||
      (!data.acceptTerms && !data.acceptPrivacy && !data.adult),
  );
