import type { Prisma } from "@prisma/client";

export class UserAccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(code);
  }
}

// All privilege changes and account removals share this transaction-scoped lock.
export async function lockUserAccess(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(774231, 1)`;
}

// Normal session sync is isolated per identity, not serialized across all shoppers.
export async function lockUserIdentity(
  tx: Prisma.TransactionClient,
  authUserId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(774232, hashtext(${authUserId}))`;
}
