/** @jest-environment node */
import { getStorefrontProduct } from "@/domains/storefront/services/catalog_service";
import type { StorefrontProduct } from "@/domains/storefront/types/catalog";
import Page, { generateMetadata } from "./page";

jest.mock("@/domains/storefront/services/catalog_service", () => ({
  getStorefrontProduct: jest.fn(),
}));
jest.mock("@/domains/storefront/components/product_detail", () => ({
  ProductDetail: () => null,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
const product: StorefrontProduct = {
  id: "p",
  slug: "public",
  name: "Public",
  shortDescription: "Description",
  longDescription: null,
  brand: null,
  image: null,
  priceCents: 10000,
  compareAtPriceCents: null,
  hasMultiplePrices: false,
  available: true,
  categories: [],
  breadcrumbs: [],
  options: [],
  variants: [],
  images: [],
  initialVariantId: "v",
  seoTitle: "Public SEO",
  seoDescription: null,
};
beforeEach(() => jest.resetAllMocks());
it("does not render an ineligible slug and marks its metadata non-indexable", async () => {
  jest.mocked(getStorefrontProduct).mockResolvedValue(null);
  const props = { params: Promise.resolve({ slug: "private" }) };
  await expect(Page(props)).rejects.toThrow("NOT_FOUND");
  expect(await generateMetadata(props)).toMatchObject({
    robots: { index: false, follow: false },
  });
});
it("uses the public service for anonymous rendering and metadata", async () => {
  jest.mocked(getStorefrontProduct).mockResolvedValue(product);
  const props = { params: Promise.resolve({ slug: "public" }) };
  const page = await Page(props);
  expect(page).toMatchObject({ props: { product } });
  expect(Object.keys(page.props.dictionary)).toEqual(["storefront", "cart"]);
  expect(await generateMetadata(props)).toMatchObject({
    title: "Public SEO",
    description: "Description",
  });
  expect(getStorefrontProduct).toHaveBeenCalledWith("public");
});
