import dictionary from "@/dictionary/es.json";
import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

it("identifies existing legal documents with standard link relations without duplicating routes", () => {
  render(<Footer dictionary={dictionary} />);
  const privacy = screen.getByRole("link", {
    name: dictionary.legal.documents.privacidad.title,
  });
  expect(privacy).toHaveAttribute("href", "/legal/privacidad");
  expect(privacy).toHaveAttribute("rel", "privacy-policy");
  const terms = screen.getByRole("link", {
    name: dictionary.legal.documents.terminos.title,
  });
  expect(terms).toHaveAttribute("href", "/legal/terminos");
  expect(terms).toHaveAttribute("rel", "terms-of-service");
  expect(
    screen.getByRole("link", { name: dictionary.landing.footer.about }),
  ).toHaveAttribute("href", "/#nosotros");
  expect(
    screen.getByRole("link", { name: dictionary.landing.footer.contact }),
  ).toHaveAttribute("href", "/#contacto");
});
