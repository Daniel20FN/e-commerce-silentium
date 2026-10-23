import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Prisma } from "@prisma/client";
import "server-only";

export class UserDeletionError extends Error {
  constructor(
    public readonly code:
      | "self"
      | "history"
      | "missing"
      | "provider"
      | "forbidden",
    public readonly status: number,
  ) {
    super(code);
  }
}

export async function deleteAdminUser(
  userId: string,
  actorId: string,
): Promise<void> {
  if (userId === actorId) throw new UserDeletionError("self", 409);
  // Auth and PostgreSQL cannot share a transaction. Delete Auth last, and allow
  // retrying a missing Auth identity if the final PostgreSQL commit was lost.
  await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM "User" WHERE id IN (${userId}, ${actorId}) ORDER BY id FOR UPDATE`,
      );
      const actor = await tx.user.findUnique({ where: { id: actorId } });
      if (
        !actor ||
        actor.role !== "super_admin" ||
        actor.status !== "active" ||
        !actor.emailVerifiedAt
      )
        throw new UserDeletionError("forbidden", 403);
      if (!locked.some((row) => row.id === userId))
        throw new UserDeletionError("missing", 404);
      const target = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (
        await tx.adminUserInvitation.count({ where: { invitedById: userId } })
      ) {
        throw new UserDeletionError("history", 409);
      }
      await tx.adminUserInvitation.deleteMany({
        where: {
          OR: [
            { email: target.email.toLowerCase() },
            ...(target.supabaseAuthUserId
              ? [{ authUserId: target.supabaseAuthUserId }]
              : []),
          ],
        },
      });
      await tx.user.delete({ where: { id: userId } });
      if (target.supabaseAuthUserId) {
        const { error } = await createSupabaseAdminClient(
          5000,
        ).auth.admin.deleteUser(target.supabaseAuthUserId, false);
        if (error && error.code !== "user_not_found")
          throw new UserDeletionError("provider", 503);
      }
    },
    { timeout: 10000 },
  );
}
