import type { ApiResponse } from "@/types/api-service/api_response";

export interface AcceptInvitationParams {
  password: string;
  acceptTerms: boolean;
}
export interface PendingInvitationData {
  email: string;
  firstName: string;
}
export interface AcceptInvitationData {
  redirectTo: string;
}
export type PendingInvitationApiResponse = ApiResponse<PendingInvitationData>;
export type AcceptInvitationApiResponse = ApiResponse<AcceptInvitationData>;
