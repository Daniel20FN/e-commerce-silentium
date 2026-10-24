/** @jest-environment node */
import { listStorefrontCatalogImages } from "@/domains/admin/media/services/catalog_media_service";
import { prisma } from "@/lib/prisma";
import { getStorefrontListing, getStorefrontProduct } from "./catalog_service";

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
integration(
  "read-only public gallery parity without fixtures or stock changes",
  () => {
    jest.setTimeout(60000);
    afterAll(async () => {
      await prisma.$disconnect();
    });

    it("matches the previous resolver for real public initial and alternate variant galleries", async () => {
      const listing = await getStorefrontListing();
      expect(listing?.items.length).toBeGreaterThan(0);
      for (const card of listing?.items.slice(0, 4) ?? []) {
        const product = await getStorefrontProduct(card.slug);
        if (!product)
          throw new Error("Catalog changed while reading public product");
        const initial = await listStorefrontCatalogImages(
          product.id,
          product.initialVariantId,
        );
        expect(product.image?.url ?? null).toBe(initial[0]?.publicUrl ?? null);
        const general = await listStorefrontCatalogImages(product.id);
        expect(product.images.map((image) => image.url)).toEqual(
          general.map((image) => image.publicUrl),
        );
        for (const variant of product.variants.slice(0, 2)) {
          const previous = await listStorefrontCatalogImages(
            product.id,
            variant.id,
          );
          const current = variant.images.length
            ? variant.images
            : product.images;
          expect(current.map((image) => image.url)).toEqual(
            previous.map((image) => image.publicUrl),
          );
        }
        expect(product).not.toHaveProperty("costs");
      }
    });
  },
);
