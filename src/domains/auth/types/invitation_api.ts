import type { LegalAcceptanceParams } from "@/domains/legal/types/api_params";
import type { ApiResponse } from "@/types/api-service/api_response";

export interface AcceptInvitationParams extends LegalAcceptanceParams {
  password: string;
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
