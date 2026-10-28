export const LEGAL_VERSION = "2026-10-28.1";
export const LEGAL_DATE = "28/10/2026";
export const LEGAL_SLUGS = [
  "terminos",
  "privacidad",
  "cookies",
  "reembolsos",
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
export function isLegalSlug(value: string): value is LegalSlug {
  return LEGAL_SLUGS.some((slug) => slug === value);
}
