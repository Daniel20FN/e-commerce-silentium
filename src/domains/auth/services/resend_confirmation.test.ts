import {
  AUTH_RESEND_ERROR,
  getResendCooldownRemainingSeconds,
  mapResendConfirmationError,
} from "./resend_confirmation";

describe("resend confirmation helpers", () => {
  it("maps common Supabase resend failures to explicit auth codes", () => {
    expect(
      mapResendConfirmationError({
        status: 429,
        message:
          "For security purposes, you can only request this after a while.",
      }),
    ).toBe(AUTH_RESEND_ERROR.rateLimited);

    expect(
      mapResendConfirmationError({
        message: "Email has already been confirmed",
      }),
    ).toBe(AUTH_RESEND_ERROR.alreadyConfirmed);

    expect(
      mapResendConfirmationError({
        message: "User not found",
      }),
    ).toBe(AUTH_RESEND_ERROR.userNotFound);
  });

  it("calculates remaining cooldown seconds safely", () => {
    expect(getResendCooldownRemainingSeconds(null, 1_000)).toBe(0);
    expect(getResendCooldownRemainingSeconds(61_000, 1_000)).toBe(60);
    expect(getResendCooldownRemainingSeconds(1_500, 1_000)).toBe(1);
    expect(getResendCooldownRemainingSeconds(1_000, 1_000)).toBe(0);
  });
});
