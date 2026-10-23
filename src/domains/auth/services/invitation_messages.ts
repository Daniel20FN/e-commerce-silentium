import type { Dictionary } from "@/dictionary/services/get-dictionary";

export function invitationMessage(
  dictionary: Pick<Dictionary, "auth">,
  code?: string,
  fallback: keyof Dictionary["auth"]["invitation"]["errors"] = "invitation_delivery_failed",
): string {
  const copy = dictionary.auth.invitation.errors;
  return (
    Object.entries(copy).find(([key]) => key === code)?.[1] ?? copy[fallback]
  );
}
