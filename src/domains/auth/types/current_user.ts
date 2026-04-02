import type { UserRole, UserStatus } from "@prisma/client";

export interface CurrentUserProfileDto {
  firstName: string | null;
  lastName: string | null;
}

export interface CurrentUserDto {
  id: string;
  authUserId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  profile: CurrentUserProfileDto;
}
