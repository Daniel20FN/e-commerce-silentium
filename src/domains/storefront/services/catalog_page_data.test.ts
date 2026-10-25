/** @jest-environment node */
import { getCatalogPageData } from "./catalog_page_data";
import { getStorefrontListing } from "./catalog_service";

jest.mock("./catalog_service", () => ({
  getStorefrontListing: jest.fn(async () => null),
}));
beforeEach(() => jest.clearAllMocks());
it("normalizes only public filter inputs and preserves pagination/category scope", async () => {
  await getCatalogPageData(
    {
      q: " lino ",
      min: "20",
      max: "10",
      orden: "price_desc",
      page: "2",
      utm_source: "instagram",
      categoria: "toallas",
    },
    "hogar",
  );
  expect(getStorefrontListing).toHaveBeenCalledWith({
    page: 2,
    q: "lino",
    filterCategorySlug: "toallas",
    minPriceCents: 1000,
    maxPriceCents: 2000,
    available: false,
    offers: false,
    sort: "price_desc",
    categorySlug: "hogar",
  });
});
it("does not invent a category scope for the complete catalog", async () => {
  await getCatalogPageData({ page: "bad", disponibles: "1", ofertas: "1" });
  expect(getStorefrontListing).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, available: true, offers: true }),
  );
  expect(getStorefrontListing).not.toHaveBeenCalledWith(
    expect.objectContaining({ categorySlug: expect.anything() }),
  );
});
