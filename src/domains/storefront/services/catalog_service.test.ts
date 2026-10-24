/** @jest-environment node */
import {
  getStorefrontCategories,
  getStorefrontFeaturedProducts,
  getStorefrontListing,
  getStorefrontProduct,
} from "./catalog_service";
const mockCategories = jest.fn();
const mockCount = jest.fn();
const mockProducts = jest.fn();
const mockProduct = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: { findMany: (args: object) => mockCategories(args) },
    product: {
      count: (args: object) => mockCount(args),
      findMany: (args: object) => mockProducts(args),
      findFirst: (args: object) => mockProduct(args),
    },
    productVariant: { fields: { priceCents: "priceCents" } },
  },
}));
const root = {
  id: "root",
  parentId: null,
  name: "Root",
  slug: "root",
  description: null,
  imageUrl: null,
  seoTitle: null,
  seoDescription: null,
  sortOrder: 0,
  isActive: true,
  deletedAt: null,
};
const image = {
  id: "img",
  publicUrl: "https://example.com/product.png",
  altText: "Product alt",
};
const product = {
  id: "p1",
  slug: "product",
  name: "Product",
  shortDescription: "Short",
  longDescription: "Long",
  brand: null,
  seoTitle: null,
  seoDescription: null,
  images: [image],
  categories: [{ categoryId: "root", isPrimary: true }],
  options: [
    {
      id: "color",
      name: "Color",
      values: [
        { id: "red", value: "Red" },
        { id: "private-value", value: "Hidden" },
      ],
    },
  ],
  variants: [
    {
      id: "v1",
      sku: "SKU",
      priceCents: 18900000,
      compareAtPriceCents: 20000000,
      stock: 2,
      isDefault: true,
      optionValues: [{ optionValueId: "red" }],
      images: [],
    },
  ],
};
describe("storefront public read contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(mockCategories).mockResolvedValue([root]);
    jest.mocked(mockCount).mockResolvedValue(1);
    jest.mocked(mockProducts).mockResolvedValue([product]);
    jest.mocked(mockProduct).mockResolvedValue(product);
  });
  it("returns only visible category DTOs, not operational flags", async () => {
    jest
      .mocked(mockCategories)
      .mockResolvedValue([
        root,
        { ...root, id: "hidden", isActive: false },
        { ...root, id: "child", parentId: "hidden" },
      ]);
    const categories = await getStorefrontCategories();
    expect(categories.map((c) => c.id)).toEqual(["root"]);
    expect(categories[0]).not.toHaveProperty("deletedAt");
    expect(categories[0]).not.toHaveProperty("isActive");
  });
  it("filters product publication and active variants in SQL without requiring stock", async () => {
    const result = await getStorefrontListing();
    expect(mockProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          deletedAt: null,
          archivedAt: null,
          categories: { some: { categoryId: { in: ["root"] } } },
          variants: { some: { isActive: true, deletedAt: null } },
        }),
        take: 24,
        skip: 0,
      }),
    );
    expect(result?.items[0]).toMatchObject({
      priceCents: 18900000,
      available: true,
      image: { alt: "Product alt" },
    });
    expect(result?.items[0]).not.toHaveProperty("variants");
  });
  it("includes only visible descendants in category queries", async () => {
    jest
      .mocked(mockCategories)
      .mockResolvedValue([
        root,
        { ...root, id: "child", slug: "child", parentId: "root" },
        { ...root, id: "hidden", parentId: "root", isActive: false },
      ]);
    await getStorefrontListing({ categorySlug: "root" });
    expect(mockProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { some: { categoryId: { in: ["root", "child"] } } },
        }),
      }),
    );
  });
  it("rejects hidden or unknown category slugs before querying products", async () => {
    expect(await getStorefrontListing({ categorySlug: "hidden" })).toBeNull();
    expect(mockProducts).not.toHaveBeenCalled();
  });
  it("keeps empty categories public and clamps pagination to existing pages", async () => {
    jest.mocked(mockCount).mockResolvedValue(0);
    jest.mocked(mockProducts).mockResolvedValue([]);
    expect(
      await getStorefrontListing({ categorySlug: "root", page: 999 }),
    ).toMatchObject({
      total: 0,
      items: [],
      page: 1,
      pageCount: 1,
      category: { id: "root" },
    });
  });
  it("paginates in the database with a stable commercial order", async () => {
    jest.mocked(mockCount).mockResolvedValue(50);
    await getStorefrontListing({ page: 3 });
    expect(mockProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 24,
        skip: 48,
        orderBy: [{ featured: "desc" }, { name: "asc" }, { id: "asc" }],
      }),
    );
  });
  it("exposes exhausted products honestly without a fabricated discount", async () => {
    jest.mocked(mockProducts).mockResolvedValue([
      {
        ...product,
        variants: [
          { ...product.variants[0], stock: 0, compareAtPriceCents: 100 },
        ],
      },
    ]);
    expect((await getStorefrontListing())?.items[0]).toMatchObject({
      available: false,
      compareAtPriceCents: null,
    });
  });
  it("does not advertise a cheaper exhausted variant as an available starting price", async () => {
    mockProducts.mockResolvedValue([
      {
        ...product,
        variants: [
          ...product.variants,
          {
            ...product.variants[0],
            id: "cheap-empty",
            stock: 0,
            priceCents: 1,
            compareAtPriceCents: 2,
          },
        ],
      },
    ]);
    expect((await getStorefrontListing())?.items[0]).toMatchObject({
      priceCents: 18900000,
      available: true,
      hasMultiplePrices: false,
      compareAtPriceCents: 20000000,
    });
  });
  it("does not expose an absent/ineligible product", async () => {
    jest.mocked(mockProduct).mockResolvedValue(null);
    expect(await getStorefrontProduct("private")).toBeNull();
    expect(mockProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "private",
          status: "active",
          deletedAt: null,
          archivedAt: null,
        }),
      }),
    );
  });
  it("reuses the selected public media and excludes values used only by hidden variants", async () => {
    const result = await getStorefrontProduct("product");
    expect(mockProduct).toHaveBeenCalledTimes(1);
    expect(result?.image?.id).toBe("img");
    expect(result?.options[0].values).toEqual([{ id: "red", value: "Red" }]);
    expect(result?.breadcrumbs.map((c) => c.id)).toEqual(["root"]);
    expect(result?.variants[0]).not.toHaveProperty("deletedAt");
    expect(result?.images[0]).toEqual({
      id: "img",
      url: image.publicUrl,
      alt: "Product alt",
    });
  });
  it("does not treat general fallback images as variant-owned images", async () => {
    const result = await getStorefrontProduct("product");
    expect(result?.variants[0].images).toEqual([]);
    expect(result?.images).toHaveLength(1);
  });
  it("never queries a pathological product slug", async () => {
    expect(await getStorefrontProduct("x".repeat(181))).toBeNull();
    expect(mockProduct).not.toHaveBeenCalled();
  });
  it("uses a variant gallery before the general gallery without copying its ownership", async () => {
    mockProduct.mockResolvedValue({
      ...product,
      variants: [{ ...product.variants[0], images: [{ ...image, id: "own" }] }],
    });
    const result = await getStorefrontProduct("product");
    expect(result?.image?.id).toBe("own");
    expect(result?.variants[0].images[0].id).toBe("own");
    expect(result?.images[0].id).toBe("img");
    expect(mockProduct.mock.calls[0][0].select.images.where).toEqual({
      status: "ready",
      deletedAt: null,
      variantId: null,
    });
    expect(
      mockProduct.mock.calls[0][0].select.variants.select.images.where,
    ).toEqual({ status: "ready", deletedAt: null });
  });
  it("returns no image when both public galleries are empty", async () => {
    mockProduct.mockResolvedValue({ ...product, images: [] });
    expect((await getStorefrontProduct("product"))?.image).toBeNull();
  });
  it("loads only four real featured cards without a pagination count", async () => {
    const result = await getStorefrontFeaturedProducts();
    expect(mockCount).not.toHaveBeenCalled();
    expect(mockProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          featured: true,
          status: "active",
          archivedAt: null,
          deletedAt: null,
        }),
        take: 4,
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    );
    expect(result[0].id).toBe("p1");
    expect(result[0]).not.toHaveProperty("variants");
  });
  it("starts the first page read before the count completes", async () => {
    let completeCount: (total: number) => void = () => {};
    mockCount.mockReturnValueOnce(
      new Promise<number>((resolve) => {
        completeCount = resolve;
      }),
    );
    const pending = getStorefrontListing();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mockProducts).toHaveBeenCalledTimes(1);
    completeCount(1);
    expect((await pending)?.page).toBe(1);
    expect(mockProducts).toHaveBeenCalledTimes(1);
  });
});
