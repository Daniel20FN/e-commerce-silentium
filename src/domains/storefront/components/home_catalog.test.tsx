import dictionary from "@/dictionary/es.json";
import { CategoriesSection } from "@/domains/home/components/sections/categories_section";
import { HeroSection } from "@/domains/home/components/sections/hero_section";
import { FeaturedProductsSection } from "@/domains/products/components/featured_products_section";
import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({ __esModule: true, default: () => null }));
it("connects the hero to the real catalog without inventing a global discount", () => {
  render(<HeroSection dictionary={dictionary} />);
  expect(
    screen.getByRole("link", { name: dictionary.storefront.allProducts }),
  ).toHaveAttribute("href", "/productos");
  expect(screen.queryByText(/30% OFF/)).not.toBeInTheDocument();
});
it("renders explicit empty merchandising states rather than fictional catalog items", () => {
  render(
    <>
      <CategoriesSection dictionary={dictionary} categories={[]} />
      <FeaturedProductsSection dictionary={dictionary} products={[]} />
    </>,
  );
  expect(
    screen.getByText(dictionary.storefront.emptyCategories),
  ).toBeInTheDocument();
  expect(
    screen.getByText(dictionary.storefront.emptyFeatured),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Sabanas de Algodon Egipcio"),
  ).not.toBeInTheDocument();
});
it("links a real featured product and exposes its actual COP price in the accessible name", () => {
  render(
    <FeaturedProductsSection
      dictionary={dictionary}
      products={[
        {
          id: "real",
          slug: "real",
          name: "Real bedding",
          shortDescription: null,
          brand: null,
          image: null,
          priceCents: 18900000,
          compareAtPriceCents: null,
          hasMultiplePrices: false,
          available: true,
        },
      ]}
    />,
  );
  expect(
    screen.getByRole("link", { name: /Real bedding.*189\.000/ }),
  ).toHaveAttribute("href", "/productos/real");
});
