/** @jest-environment node */

import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  projectOAuthConsentDictionary,
  projectOAuthNoticeDictionary,
} from "./oauth_dictionary";

describe("OAuth dictionary projections", () => {
  const dictionary = getDictionary("es");

  it("notice copy carries only the shared general slice", () => {
    const projected = projectOAuthNoticeDictionary(dictionary);
    expect(Object.keys(projected)).toEqual(["general"]);
    expect(projected.general).toBe(dictionary.general);
  });

  it("consent copy carries only general and mcpOAuth.consent, never legal documents", () => {
    const projected = projectOAuthConsentDictionary(dictionary);
    expect(Object.keys(projected).sort()).toEqual(["general", "mcpOAuth"]);
    expect(Object.keys(projected.mcpOAuth)).toEqual(["consent"]);
    expect(projected.mcpOAuth.consent).toBe(dictionary.mcpOAuth.consent);
    // What the browser receives stays a few KB instead of the whole dictionary.
    expect(JSON.stringify(projected).length).toBeLessThan(5_000);
    expect(JSON.stringify(projected)).not.toContain(
      JSON.stringify(dictionary.legal).slice(0, 200),
    );
  });
});
