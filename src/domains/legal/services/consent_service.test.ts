/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import type { LegalPreferencesParams } from "../types/api_params";
import { legalSnapshot, recordLegalDecisions } from "./consent_service";
import { LEGAL_VERSION } from "./legal_release";
import { legalPreferencesSchema } from "./legal_schemas";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
const release = { createMany: jest.fn(), findUniqueOrThrow: jest.fn() };
const event = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  createMany: jest.fn(),
};
const preference = { findUnique: jest.fn(), upsert: jest.fn() };
const tx = {
  legalRelease: release,
  legalConsentEvent: event,
  userPreference: preference,
};
const input: LegalPreferencesParams = {
  acceptTerms: true,
  acceptPrivacy: true,
  adult: true,
  legalVersion: LEGAL_VERSION,
  acceptsMarketingEmails: false,
  acceptsWhatsAppMarketing: true,
  requestId: "538a11dd-dc29-4f7d-bc61-21c3c65244fb",
};
beforeEach(() => {
  jest.clearAllMocks();
  release.findUniqueOrThrow.mockResolvedValue(legalSnapshot());
  event.findMany.mockResolvedValue([]);
  preference.findUnique.mockResolvedValue({
    acceptsMarketingEmails: true,
    acceptsWhatsAppMarketing: false,
  });
});
it("captures exact document content and separate decisions without IP or tokens", async () => {
  await recordLegalDecisions(tx as never, "owner", input, "account");
  expect(event.createMany.mock.calls[0][0].data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        purpose: "terms",
        action: "accepted",
        source: "account",
      }),
      expect.objectContaining({ purpose: "privacy", action: "accepted" }),
      expect.objectContaining({ purpose: "adult", action: "accepted" }),
      expect.objectContaining({ purpose: "email", action: "withdrawn" }),
      expect.objectContaining({ purpose: "whatsapp", action: "accepted" }),
    ]),
  );
  const snapshot = legalSnapshot();
  expect(snapshot.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.parse(snapshot.content).controls.privacy).toContain("Autorizo");
  expect(JSON.stringify(event.createMany.mock.calls)).not.toMatch(
    /userAgent|ipAddress|token|password/,
  );
});
it("rejects changing copy beneath an existing release", async () => {
  release.findUniqueOrThrow.mockResolvedValue({
    content: "old",
    hash: "other",
  });
  await expect(
    recordLegalDecisions(tx as never, "owner", input, "registration"),
  ).rejects.toThrow("legal_version_changed");
  expect(event.createMany).not.toHaveBeenCalled();
});
it("accepts retry only for the same payload and does not rewrite current preferences", async () => {
  event.findMany.mockResolvedValue(
    ["terms", "privacy", "adult", "email", "whatsapp"].map((purpose) => ({
      purpose,
      version: LEGAL_VERSION,
      source: "account",
      action: purpose === "email" ? "withdrawn" : "accepted",
    })),
  );
  await recordLegalDecisions(tx as never, "owner", input, "account");
  expect(preference.upsert).not.toHaveBeenCalled();
  await expect(
    recordLegalDecisions(
      tx as never,
      "owner",
      { ...input, acceptsMarketingEmails: true },
      "account",
    ),
  ).rejects.toThrow("legal_request_changed");
});
it("allows marketing withdrawal without accepting terms or privacy again", async () => {
  const withdrawal = {
    ...input,
    acceptTerms: false,
    acceptPrivacy: false,
    adult: false,
    acceptsWhatsAppMarketing: false,
  };
  expect(legalPreferencesSchema.safeParse(withdrawal).success).toBe(true);
  await recordLegalDecisions(tx as never, "owner", withdrawal, "account");
  expect(event.createMany.mock.calls[0][0].data).toHaveLength(2);
  expect(preference.upsert.mock.calls[0][0].update).not.toHaveProperty(
    "acceptedTermsAt",
  );
});
it("does not authorize a new promotional purpose from legacy dates alone", async () => {
  event.findFirst.mockResolvedValue(null);
  await expect(
    recordLegalDecisions(
      tx as never,
      "owner",
      { ...input, acceptTerms: false, acceptPrivacy: false, adult: false },
      "account",
    ),
  ).rejects.toThrow("legal_acceptance_required");
  expect(event.createMany).not.toHaveBeenCalled();
});
it("rejects partial required decisions and stale versions", () => {
  expect(
    legalPreferencesSchema.safeParse({ ...input, acceptPrivacy: false })
      .success,
  ).toBe(false);
  expect(
    legalPreferencesSchema.safeParse({ ...input, legalVersion: "old" }).success,
  ).toBe(false);
  expect(prisma).toBeDefined();
});
