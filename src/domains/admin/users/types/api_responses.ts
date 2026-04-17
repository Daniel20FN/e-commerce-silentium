import type { ApiResponse } from "@/types/api-service/api_response";
import type { AdminUserRole, AdminUserStatus } from "./shared";

export interface AdminUserListItemDto {
  id: string;
  authUserId: string | null;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  phone: string | null;
  createdAt: string;
  lastAccessAt: string | null;
}

export interface AdminUsersListApiResponseData {
  users: AdminUserListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminUserMutationApiResponseData {
  user: AdminUserListItemDto;
}

export type AdminUsersListApiResponse =
  ApiResponse<AdminUsersListApiResponseData>;
export type AdminUserMutationApiResponse =
  ApiResponse<AdminUserMutationApiResponseData>;
