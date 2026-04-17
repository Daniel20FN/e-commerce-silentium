import "server-only";

import type { AdminUsersListParams } from "@/domains/admin/users/types/api_params";
import type { AdminUserListItemDto } from "@/domains/admin/users/types/api_responses";
import {
  ADMIN_USER_SORT_DIRECTION,
  ADMIN_USER_SORT_FIELD,
} from "@/domains/admin/users/types/shared";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AdminUserRecord = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
}>;

export interface AdminUserDetailRecord {
  id: string;
  authUserId: string | null;
  email: string;
  role: AdminUserListItemDto["role"];
  status: AdminUserListItemDto["status"];
  emailVerified: boolean;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt: Date | null;
}

export interface AdminUsersListResult {
  users: AdminUserListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

function toAdminUserListItem(user: AdminUserRecord): AdminUserListItemDto {
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

export function getAdminUserFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(
    (value): value is string => Boolean(value),
  );

  return parts.join(" ");
}

function buildSearchWhere(search: string): Prisma.UserWhereInput | undefined {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return undefined;
  }

  const terms = normalizedSearch
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return {
    AND: terms.map((term) => ({
      OR: [
        { id: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        {
          profile: {
            is: {
              OR: [
                { firstName: { contains: term, mode: "insensitive" } },
                { lastName: { contains: term, mode: "insensitive" } },
                { phone: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    })),
  };
}

function buildOrderBy(
  sortField: NonNullable<AdminUsersListParams["sortField"]>,
  sortDirection: NonNullable<AdminUsersListParams["sortDirection"]>,
): Prisma.UserOrderByWithRelationInput[] {
  const direction =
    sortDirection === ADMIN_USER_SORT_DIRECTION.asc ? "asc" : "desc";

  switch (sortField) {
    case ADMIN_USER_SORT_FIELD.fullName:
      return [
        { profile: { lastName: direction } },
        { profile: { firstName: direction } },
        { email: direction },
      ];
    case ADMIN_USER_SORT_FIELD.email:
      return [{ email: direction }];
    case ADMIN_USER_SORT_FIELD.role:
      return [{ role: direction }, { email: "asc" }];
    case ADMIN_USER_SORT_FIELD.status:
      return [{ status: direction }, { email: "asc" }];
    case ADMIN_USER_SORT_FIELD.phone:
      return [{ profile: { phone: direction } }, { email: "asc" }];
    case ADMIN_USER_SORT_FIELD.lastAccessAt:
      return [{ lastLoginAt: direction }, { email: "asc" }];
    case ADMIN_USER_SORT_FIELD.createdAt:
    default:
      return [{ createdAt: direction }, { email: "asc" }];
  }
}

interface ResolvedAdminUsersListParams {
  page: number;
  pageSize: number;
  search: string;
  role?: AdminUsersListParams["role"];
  status?: AdminUsersListParams["status"];
  sortField: NonNullable<AdminUsersListParams["sortField"]>;
  sortDirection: NonNullable<AdminUsersListParams["sortDirection"]>;
}

export async function listAdminUsers(
  params: ResolvedAdminUsersListParams,
): Promise<AdminUsersListResult> {
  const where: Prisma.UserWhereInput = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(buildSearchWhere(params.search) ?? {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        profile: true,
      },
      orderBy: buildOrderBy(params.sortField, params.sortDirection),
      skip: params.page * params.pageSize,
      take: params.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(toAdminUserListItem),
    page: params.page,
    pageSize: params.pageSize,
    total,
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetailRecord | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    authUserId: user.supabaseAuthUserId,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    fullName:
      getAdminUserFullName(user.profile?.firstName, user.profile?.lastName) ||
      user.email,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    phone: user.profile?.phone ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastAccessAt: user.lastLoginAt,
  };
}
