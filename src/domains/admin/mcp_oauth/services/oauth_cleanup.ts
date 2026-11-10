import { prisma } from "@/lib/prisma";
import "server-only";
import { OAUTH_EXPIRED_RETENTION_MS } from "./oauth_rules";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Opportunistic cleanup, run while issuing authorization codes (an infrequent,
 * authenticated operation) instead of a scheduler. Removes expired codes,
 * grants that expired or were revoked more than 30 days ago (their tokens
 * cascade) and lapsed tokens. Failures never block the caller.
 */
export async function purgeExpiredOAuthData(now: Date): Promise<void> {
  const codeCutoff = new Date(now.getTime() - DAY_MS);
  const grantCutoff = new Date(now.getTime() - OAUTH_EXPIRED_RETENTION_MS);
  try {
    await prisma.mcpOAuthCode.deleteMany({
      where: { expiresAt: { lt: codeCutoff } },
    });
    await prisma.mcpOAuthGrant.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: grantCutoff } },
          { revokedAt: { lt: grantCutoff } },
        ],
      },
    });
    await prisma.mcpOAuthToken.deleteMany({
      where: { kind: "access", expiresAt: { lt: codeCutoff } },
    });
  } catch {
    console.error("mcp_oauth_cleanup_failed");
  }
}
