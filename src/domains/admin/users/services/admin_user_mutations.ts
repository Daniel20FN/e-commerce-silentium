import "server-only";

import type { AdminUserUpdateParams } from "@/domains/admin/users/types/api_params";
import type { AdminUserListItemDto } from "@/domains/admin/users/types/api_responses";
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
): Promise<AdminUserListItemDto> {
  const user = await prisma.user.update({
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

  return toAdminUserListItem(user);
}
