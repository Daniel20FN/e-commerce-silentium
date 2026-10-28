import type { LegalAcceptanceParams } from "@/domains/legal/types/api_params";
export interface RegisterApiParams extends LegalAcceptanceParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptsMarketingEmails: boolean;
  acceptsWhatsAppMarketing: boolean;
}

export interface LoginApiParams {
  email: string;
  password: string;
  returnTo?: string;
}

export interface LogoutApiParams {
  redirectTo?: string;
}

export interface ResendConfirmationApiParams {
  email: string;
}
