import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import type { ApiResponse } from "@/types/api-service/api_response";
export interface AccountData {
  user: CurrentUserDto;
  phone: string;
}
export type AccountApiResponse = ApiResponse<AccountData>;
export type AccountActionApiResponse = ApiResponse<{ success: boolean }>;
