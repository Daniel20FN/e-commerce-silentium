import { prisma } from "@/lib/prisma";
import "server-only";

export async function readLegalEvidence(userId: string) {
  const events = await prisma.legalConsentEvent.findMany({
    where: { userId },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    include: { release: true },
  });
  return {
    exportedAt: new Date().toISOString(),
    userId,
    events: events.map(({ release, ...event }) => ({
      ...event,
      documentHash: release.hash,
      identityAssurance:
        event.source === "registration"
          ? "email-not-yet-verified-at-submission"
          : "verified-session",
    })),
    releases: Array.from(
      new Map(events.map(({ release }) => [release.version, release])).values(),
    ),
  };
}
