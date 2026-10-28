/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { recordLegalDecisions } from "./consent_service";
import { LEGAL_VERSION } from "./legal_release";

jest.mock("server-only", () => ({}));
const integration =
  process.env.LEGAL_INTEGRATION === "1" ? describe : describe.skip;
integration("legal evidence PostgreSQL (all fixtures rolled back)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  it("records exact decisions atomically, rejects mutation and denies anonymous SQL", async () => {
    const fixtureId = `legal-check-${randomUUID()}`;
    const rollback = new Error("intentional_legal_check_rollback");
    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.user.create({
            data: { id: fixtureId, email: `${fixtureId}@example.invalid` },
          });
          const input = {
            acceptTerms: true,
            acceptPrivacy: true,
            adult: true,
            legalVersion: LEGAL_VERSION,
            acceptsMarketingEmails: true,
            acceptsWhatsAppMarketing: false,
            requestId: randomUUID(),
          };
          await recordLegalDecisions(tx, fixtureId, input, "registration");
          expect(
            await tx.legalConsentEvent.count({ where: { userId: fixtureId } }),
          ).toBe(5);
          await recordLegalDecisions(tx, fixtureId, input, "registration");
          expect(
            await tx.legalConsentEvent.count({ where: { userId: fixtureId } }),
          ).toBe(5);
          await recordLegalDecisions(
            tx,
            fixtureId,
            {
              ...input,
              acceptTerms: false,
              acceptPrivacy: false,
              adult: false,
              acceptsMarketingEmails: false,
              requestId: randomUUID(),
            },
            "account",
          );
          expect(
            await tx.legalConsentEvent.count({
              where: {
                userId: fixtureId,
                purpose: "email",
                action: "withdrawn",
              },
            }),
          ).toBe(1);
          for (const table of ["LegalRelease", "LegalConsentEvent"]) {
            await tx.$executeRawUnsafe("SAVEPOINT legal_check");
            const query =
              table === "LegalRelease"
                ? 'UPDATE "LegalRelease" SET "hash" = "hash" WHERE "version" = $1'
                : 'UPDATE "LegalConsentEvent" SET "source" = "source" WHERE "userId" = $1';
            await expect(
              tx.$executeRawUnsafe(
                query,
                table === "LegalRelease" ? LEGAL_VERSION : fixtureId,
              ),
            ).rejects.toThrow("legal evidence is append-only");
            await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT legal_check");
            await tx.$executeRawUnsafe("RELEASE SAVEPOINT legal_check");
            for (const role of ["anon", "authenticated"]) {
              await tx.$executeRawUnsafe("SAVEPOINT legal_check");
              await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
              await expect(
                tx.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 1`),
              ).rejects.toThrow();
              await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT legal_check");
              await tx.$executeRawUnsafe("RELEASE SAVEPOINT legal_check");
            }
          }
          throw rollback;
        },
        { timeout: 30000 },
      ),
    ).rejects.toBe(rollback);
    expect(
      await prisma.user.findUnique({ where: { id: fixtureId } }),
    ).toBeNull();
    expect(
      await prisma.legalConsentEvent.count({ where: { userId: fixtureId } }),
    ).toBe(0);
  }, 40000);
});
