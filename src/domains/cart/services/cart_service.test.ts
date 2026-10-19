/** @jest-environment node */
import { getStorefrontCategories } from "@/domains/storefront/services/catalog_service";
import { resolveCart } from "./cart_service";
const mockVariants = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    productVariant: { findMany: (args: object) => mockVariants(args) },
  },
}));
jest.mock("@/domains/admin/media/services/catalog_media_service", () => ({
  listStorefrontCatalogImages: jest.fn(),
}));
jest.mock("@/domains/storefront/services/catalog_service", () => {
  const actual = jest.requireActual<
    typeof import("@/domains/storefront/services/catalog_service")
  >("@/domains/storefront/services/catalog_service");
  return { ...actual, getStorefrontCategories: jest.fn() };
});
const image = {
  id: "image",
  publicUrl: "https://images.example.com/photo.png",
  altText: "Marfil",
};
const variant = {
  id: "v",
  sku: "SKU",
  priceCents: 21900000,
  stock: 4,
  images: [],
  optionValues: [
    {
      optionValue: {
        value: "Marfil",
        option: { name: "Color", displayOrder: 1 },
      },
    },
  ],
  product: { name: "Aurora", slug: "aurora", images: [image] },
};
describe("authoritative cart quote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getStorefrontCategories).mockResolvedValue([
      {
        id: "visible",
        name: "Visible",
        slug: "visible",
        parentId: null,
        sortOrder: 0,
        description: null,
        imageUrl: null,
        seoTitle: null,
        seoDescription: null,
      },
    ]);
    mockVariants.mockResolvedValue([variant]);
  });
  it("resolves trusted unit prices, quantities and fallback images without stock writes", async () => {
    const result = await resolveCart({
      items: [{ variantId: "v", quantity: 2 }],
    });
    expect(result).toMatchObject({
      valid: true,
      subtotalCents: 43800000,
      lines: [
        {
          status: "available",
          priceCents: 21900000,
          subtotalCents: 43800000,
          attributes: "Color: Marfil",
          image: { url: image.publicUrl },
        },
      ],
    });
    expect(mockVariants).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
          product: expect.objectContaining({
            status: "active",
            deletedAt: null,
            archivedAt: null,
            categories: { some: { categoryId: { in: ["visible"] } } },
          }),
        }),
      }),
    );
    const query = JSON.stringify(mockVariants.mock.calls[0]);
    expect(query).not.toMatch(/cost|margin|description/i);
  });
  it("uses own photo and new price, permits zero price", async () => {
    mockVariants.mockResolvedValue([
      { ...variant, priceCents: 0, images: [{ ...image, id: "own" }] },
    ]);
    const result = await resolveCart({
      items: [{ variantId: "v", quantity: 1 }],
    });
    expect(result).toMatchObject({
      valid: true,
      subtotalCents: 0,
      lines: [{ image: { id: "own" }, priceCents: 0 }],
    });
  });
  it("keeps reduced-stock quantity but excludes invalid line from subtotal", async () => {
    const result = await resolveCart({
      items: [{ variantId: "v", quantity: 5 }],
    });
    expect(result).toMatchObject({
      valid: false,
      subtotalCents: 0,
      lines: [
        {
          quantity: 5,
          status: "insufficient_stock",
          maxQuantity: 4,
          subtotalCents: null,
        },
      ],
    });
  });
  it("keeps missing/hidden IDs as generic nonbuyable lines, no hidden metadata", async () => {
    mockVariants.mockResolvedValue([]);
    expect(
      await resolveCart({ items: [{ variantId: "hidden", quantity: 1 }] }),
    ).toMatchObject({
      valid: false,
      lines: [
        {
          status: "unavailable",
          name: null,
          sku: null,
          image: null,
          priceCents: null,
        },
      ],
    });
  });
  it("caps quantity to 99, marks zero stock unavailable, empty avoids queries", async () => {
    mockVariants.mockResolvedValue([{ ...variant, stock: 1000 }]);
    expect(
      (await resolveCart({ items: [{ variantId: "v", quantity: 1 }] })).lines[0]
        .maxQuantity,
    ).toBe(99);
    mockVariants.mockResolvedValue([{ ...variant, stock: 0 }]);
    expect(
      (await resolveCart({ items: [{ variantId: "v", quantity: 1 }] })).lines[0]
        .status,
    ).toBe("unavailable");
    mockVariants.mockClear();
    expect(await resolveCart({ items: [] })).toEqual({
      lines: [],
      valid: false,
      subtotalCents: 0,
    });
    expect(mockVariants).not.toHaveBeenCalled();
  });
});
