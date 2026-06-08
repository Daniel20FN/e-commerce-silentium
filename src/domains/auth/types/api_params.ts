export interface RegisterApiParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
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
