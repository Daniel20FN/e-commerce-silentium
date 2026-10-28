import dictionary from "@/dictionary/es.json";
import { registerSchema } from "@/domains/auth/services/auth_schemas";
import { LEGAL_SLUGS, LEGAL_VERSION } from "./legal_release";

it("publishes complete legal copy without draft placeholders or invented ownership", () => {
  for (const slug of LEGAL_SLUGS) {
    const doc = dictionary.legal.documents[slug];
    expect(doc.sections.length).toBeGreaterThan(1);
    expect(JSON.stringify(doc)).not.toMatch(
      /BORRADOR|NO PUBLICAR|\[pendiente|\.borrador\.md/i,
    );
  }
  expect(
    dictionary.legal.documents.terminos.sections[0].paragraphs.join(" "),
  ).toContain("53011895-5");
});
it("requires privacy and adult decisions separately and allows no marketing", () => {
  const fields = {
    email: "client@example.invalid",
    password: "example-password",
    firstName: "Ana",
    lastName: "Prueba",
    acceptTerms: true,
    acceptPrivacy: true,
    adult: true,
    legalVersion: LEGAL_VERSION,
  };
  expect(registerSchema.parse(fields).acceptsMarketingEmails).toBe(false);
  for (const key of ["acceptTerms", "acceptPrivacy", "adult"])
    expect(registerSchema.safeParse({ ...fields, [key]: false }).success).toBe(
      false,
    );
  expect(
    registerSchema.safeParse({ ...fields, legalVersion: "old" }).success,
  ).toBe(false);
});
