export const AUTH_RESEND_COOLDOWN = {
  seconds: 60,
} as const;

export const AUTH_RESEND_ERROR = {
  rateLimited: "resend_confirmation_rate_limited",
  alreadyConfirmed: "email_already_confirmed",
  userNotFound: "resend_confirmation_user_not_found",
  unexpected: "unexpected_auth_error",
} as const;

interface SupabaseAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

export type AuthResendErrorCode =
  (typeof AUTH_RESEND_ERROR)[keyof typeof AUTH_RESEND_ERROR];

export function mapResendConfirmationError(
  error: SupabaseAuthErrorLike,
): AuthResendErrorCode {
  const normalizedMessage = error.message?.toLowerCase() ?? "";
  const normalizedCode = error.code?.toLowerCase() ?? "";

  if (
    error.status === 429 ||
    normalizedCode.includes("rate_limit") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("security purposes")
  ) {
    return AUTH_RESEND_ERROR.rateLimited;
  }

  if (
    normalizedMessage.includes("already been confirmed") ||
    normalizedMessage.includes("already confirmed") ||
    normalizedMessage.includes("already verified")
  ) {
    return AUTH_RESEND_ERROR.alreadyConfirmed;
  }

  if (
    normalizedMessage.includes("user not found") ||
    normalizedMessage.includes("email not found") ||
    normalizedMessage.includes("unable to find")
  ) {
    return AUTH_RESEND_ERROR.userNotFound;
  }

  return AUTH_RESEND_ERROR.unexpected;
}

export function getResendCooldownRemainingSeconds(
  availableAt: number | null,
  now: number,
): number {
  if (!availableAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((availableAt - now) / 1000));
}
