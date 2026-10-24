import "server-only";

import type { AdminUserUpdateParams } from "@/domains/admin/users/types/api_params";
import type { AdminUserListItemDto } from "@/domains/admin/users/types/api_responses";
import { isDeletedAccount } from "@/domains/auth/services/deleted_account";
import {
  lockUserAccess,
  UserAccessError,
} from "@/domains/auth/services/user_access_lock";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAdminUserFullName } from "./admin_user_queries";

type AdminUserMutationRecord = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
}>;

function toAdminUserListItem(
  user: AdminUserMutationRecord,
): AdminUserListItemDto {
  return {
    id: user.id,
    authUserId: user.supabaseAuthUserId,
    fullName: getAdminUserFullName(
      user.profile?.firstName,
      user.profile?.lastName,
    ),
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.profile?.phone ?? null,
    createdAt: user.createdAt.toISOString(),
    lastAccessAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function updateAdminUser(
  userId: string,
  input: AdminUserUpdateParams,
  actorId: string,
): Promise<AdminUserListItemDto> {
  const user = await prisma.$transaction(async (tx) => {
    await lockUserAccess(tx);
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (
      !actor ||
      actor.role !== "super_admin" ||
      actor.status !== "active" ||
      !actor.emailVerifiedAt
    )
      throw new UserAccessError("forbidden", 403);
    const target = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (isDeletedAccount(target.email))
      throw new UserAccessError("account_deleted", 409);
    if (
      target.role === "super_admin" &&
      target.status === "active" &&
      target.emailVerifiedAt &&
      ((input.role && input.role !== "super_admin") ||
        (input.status && input.status !== "active"))
    ) {
      const others = await tx.user.count({
        where: {
          id: { not: userId },
          role: "super_admin",
          status: "active",
          emailVerifiedAt: { not: null },
        },
      });
      if (!others) throw new UserAccessError("account_last_superadmin", 409);
    }
    return tx.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        profile: true,
      },
    });
  });

  return toAdminUserListItem(user);
}
