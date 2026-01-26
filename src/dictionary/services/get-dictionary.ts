import { Language } from "@prisma/client";
import es from "../es.json";

export type Dictionary = typeof es;

const DICTS: Record<Language, Dictionary> = {
  es,
};

// Si prefieres mantener la firma async para no tocar llamadas existentes:
export function getDictionary(language: Language): Dictionary {
  return DICTS[language] ?? es;
}
