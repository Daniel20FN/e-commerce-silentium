/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { filteredCatalogPage } from "./catalog_filter_query";
import {
  getStorefrontCategories,
  getStorefrontListing,
  publicProductWhere,
} from "./catalog_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.STOREFRONT_INTEGRATION === "1") {
    const dotenv = jest.requireActual<typeof import("dotenv")>("dotenv");
    const parsed = dotenv.config({
      path: ".env.development",
      override: true,
      quiet: true,
    }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error("Explicit development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.STOREFRONT_INTEGRATION === "1" ? describe : describe.skip;
integration("read-only public catalog filtering PostgreSQL parity", () => {
  jest.setTimeout(60000);
  afterAll(async () => {
    await prisma.$disconnect();
  });
  async function snapshot() {
    const categories = await getStorefrontCategories();
    const products = await prisma.product.findMany({
      where: publicProductWhere(categories),
      select: {
        id: true,
        name: true,
        variants: {
          where: { deletedAt: null, isActive: true },
          select: { priceCents: true, stock: true, compareAtPriceCents: true },
        },
      },
    });
    return {
      ids: categories.map((item) => item.id),
      products: products.map((product) => {
        const available = product.variants.filter(
          (variant) => variant.stock > 0,
        );
        return {
          id: product.id,
          name: product.name,
          price: Math.min(
            ...(available.length ? available : product.variants).map(
              (variant) => variant.priceCents,
            ),
          ),
          available: available.length > 0,
          offer: product.variants.some(
            (variant) =>
              variant.compareAtPriceCents !== null &&
              variant.compareAtPriceCents > variant.priceCents,
          ),
        };
      }),
    };
  }
  it("matches public prices and paginates stable ascending/descending results without loading every card", async () => {
    const data = await snapshot();
    const ascending = await getStorefrontListing({ sort: "price_asc" });
    expect(ascending?.total).toBe(data.products.length);
    expect(ascending?.items.length).toBeLessThanOrEqual(24);
    const prices = ascending?.items.map((item) => item.priceCents) ?? [];
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const descending = await getStorefrontListing({
      sort: "price_desc",
      page: 99999,
    });
    expect(descending?.page).toBe(descending?.pageCount);
    const descPrices = descending?.items.map((item) => item.priceCents) ?? [];
    expect(descPrices).toEqual([...descPrices].sort((a, b) => b - a));
    for (const item of [
      ...(ascending?.items ?? []),
      ...(descending?.items ?? []),
    ])
      expect(item.priceCents).toBe(
        data.products.find((product) => product.id === item.id)?.price,
      );
  });
  it("applies inclusive COP bounds, stock and offers together before count/page", async () => {
    const data = await snapshot();
    const min = 5000000,
      max = 15000000;
    const expected = data.products.filter(
      (product) =>
        product.price >= min &&
        product.price <= max &&
        product.available &&
        product.offer,
    );
    const result = await filteredCatalogPage(
      {
        minPriceCents: min,
        maxPriceCents: max,
        available: true,
        offers: true,
        sort: "price_asc",
      },
      data.ids,
    );
    expect(result.total).toBe(expected.length);
    expect(
      result.ids.every((id) => expected.some((product) => product.id === id)),
    ).toBe(true);
  });
  it("searches case/accent insensitively and treats SQL and wildcard characters literally", async () => {
    const data = await snapshot();
    const expected = data.products.filter((product) =>
      product.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes("sabana"),
    );
    expect((await filteredCatalogPage({ q: "SABANA" }, data.ids)).total).toBe(
      expected.length,
    );
    expect(
      (await filteredCatalogPage({ q: "%' OR true --" }, data.ids)).total,
    ).toBe(0);
  });
});
