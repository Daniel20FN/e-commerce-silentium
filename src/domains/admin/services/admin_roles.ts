import type { CurrentUserDto } from "@/domains/auth/types/current_user";

const ADMIN_ROLE = {
  admin: "admin",
  superAdmin: "super_admin",
} as const;

const ADMIN_ROLE_VALUES = Object.values(
  ADMIN_ROLE,
) as readonly CurrentUserDto["role"][];

export function hasAdminAccess(role: CurrentUserDto["role"]): boolean {
  return ADMIN_ROLE_VALUES.includes(role);
}

export function canAccessAdmin(
  user: CurrentUserDto | null,
): user is CurrentUserDto {
  return user !== null && hasAdminAccess(user.role);
}
