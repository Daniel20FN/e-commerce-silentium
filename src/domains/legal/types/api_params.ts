import type { ApiResponse } from "@/types/api-service/api_response";

export interface LegalAcceptanceParams {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  adult: boolean;
  legalVersion: string;
}
export interface LegalPreferencesParams extends LegalAcceptanceParams {
  acceptsMarketingEmails: boolean;
  acceptsWhatsAppMarketing: boolean;
  requestId: string;
}
export interface LegalPreferencesData {
  acceptsMarketingEmails: boolean;
  acceptsWhatsAppMarketing: boolean;
  currentAccepted: boolean;
}
export type LegalPreferencesResponse = ApiResponse<LegalPreferencesData>;
