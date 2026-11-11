import type { Dictionary } from "@/dictionary/services/get-dictionary";

/** Copy the notice screen needs (denied account, untrusted request). */
export interface OAuthNoticeDictionary {
  general: Dictionary["general"];
}

/** Copy the consent screen needs. */
export interface OAuthConsentDictionary extends OAuthNoticeDictionary {
  mcpOAuth: { consent: Dictionary["mcpOAuth"]["consent"] };
}

/**
 * Server pages hand dictionaries to client components, which serializes them
 * into the HTML. Project only the slices a screen renders: the full dictionary
 * carries the legal documents (150 KB+). Object literals, not Pick<>, because
 * a type alone does not remove anything at runtime.
 */
export function projectOAuthNoticeDictionary(
  dictionary: Dictionary,
): OAuthNoticeDictionary {
  return { general: dictionary.general };
}

export function projectOAuthConsentDictionary(
  dictionary: Dictionary,
): OAuthConsentDictionary {
  return {
    general: dictionary.general,
    mcpOAuth: { consent: dictionary.mcpOAuth.consent },
  };
}
