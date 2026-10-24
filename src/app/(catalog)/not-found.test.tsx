import { CatalogLink } from "@/domains/storefront/components/catalog_cards";
import { render } from "@testing-library/react";
import NotFound from "./not-found";

jest.mock("@/domains/storefront/components/catalog_cards", () => ({
  CatalogLink: jest.fn(() => null),
}));

it("does not serialize the full dictionary into fallback trees included in successful routes", () => {
  render(<NotFound />);
  const copy = jest.mocked(CatalogLink).mock.calls[0][0].dictionary;
  expect(Object.keys(copy)).toEqual(["storefront"]);
  expect(copy).not.toHaveProperty("admin");
  expect(copy).not.toHaveProperty("auth");
});
