export class InvitationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
  }
}

export function invitationDeliveryError(error: {
  code?: string;
  message?: string;
}): InvitationError {
  if (
    error.code === "email_address_not_authorized" ||
    /email.*not authorized|only.*team/i.test(error.message ?? "")
  ) {
    return new InvitationError("invitation_email_restricted", 503);
  }
  if (
    ["over_email_send_rate_limit", "over_request_rate_limit"].includes(
      error.code ?? "",
    )
  ) {
    return new InvitationError("invitation_rate_limit", 429);
  }
  if (["email_exists", "user_already_exists"].includes(error.code ?? "")) {
    return new InvitationError("invitation_user_exists", 409);
  }
  return new InvitationError("invitation_delivery_failed", 503);
}

export function invitationOrigin(): string {
  const raw =
    process.env.APP_PUBLIC_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new InvitationError("invitation_origin_missing", 503);
  }
}
