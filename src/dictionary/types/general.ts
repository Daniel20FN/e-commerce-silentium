import { Language } from "@prisma/client";

export const languageTranslations: { [key in Language]: string } = {
  es: "Español",
};

export function isLanguage(x: string): x is Language {
  return Object.prototype.hasOwnProperty.call(languageTranslations, x);
}

export const languages: Language[] = Object.keys(
  languageTranslations,
) as Language[];
