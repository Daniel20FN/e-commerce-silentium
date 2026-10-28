import type { Dictionary } from "@/dictionary/services/get-dictionary";
export type LegalUiCopy = Pick<
  Dictionary["legal"],
  "controls" | "termsLink" | "privacyLink" | "error" | "settings"
>;
export function getLegalUiCopy(dictionary: Dictionary): LegalUiCopy {
  const copy = dictionary.legal;
  return {
    controls: copy.controls,
    termsLink: copy.termsLink,
    privacyLink: copy.privacyLink,
    error: copy.error,
    settings: copy.settings,
  };
}
