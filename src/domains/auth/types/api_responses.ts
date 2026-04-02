import type { ApiResponse } from "@/types/api-service/api_response";
import type { CurrentUserDto } from "./current_user";

export interface RegisterApiResponseData {
  requiresEmailConfirmation: boolean;
  email: string;
}

export interface LoginApiResponseData {
  user: CurrentUserDto;
  redirectTo: string;
}

export interface CurrentUserApiResponseData {
  user: CurrentUserDto | null;
}

export interface LogoutApiResponseData {
  success: true;
  redirectTo: string;
}

export interface ResendConfirmationApiResponseData {
  email: string;
  cooldownSeconds: number;
}

export type RegisterApiResponse = ApiResponse<RegisterApiResponseData>;
export type LoginApiResponse = ApiResponse<LoginApiResponseData>;
export type CurrentUserApiResponse = ApiResponse<CurrentUserApiResponseData>;
export type LogoutApiResponse = ApiResponse<LogoutApiResponseData>;
export type ResendConfirmationApiResponse =
  ApiResponse<ResendConfirmationApiResponseData>;
