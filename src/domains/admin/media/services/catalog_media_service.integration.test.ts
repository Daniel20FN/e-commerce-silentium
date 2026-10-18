/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import {
  completeCatalogImageUpload,
  getCatalogGallery,
  prepareCatalogImageUpload,
  saveCatalogGallery,
} from "./catalog_media_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.CATALOG_MEDIA_INTEGRATION === "1") {
    const dotenv = jest.requireActual<typeof import("dotenv")>("dotenv");
    const parsed = dotenv.config({
      path: ".env.development",
      override: true,
      quiet: true,
    }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error(
        "Integration tests require DATABASE_URL explicitly in .env.development",
      );
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
jest.mock("./catalog_image_storage", () => ({
  describeImageUpload: (
    _target: object,
    file: { name: string; type: string; size: number },
  ) => ({
    bucket: "qa-integration-no-files",
    path: `qa/${crypto.randomUUID()}.png`,
    publicUrl: "https://example.invalid/qa.png",
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  }),
  uploadReservedImage: jest.fn().mockResolvedValue(undefined),
  signReservedImage: jest
    .fn()
    .mockResolvedValue("https://example.invalid/signed"),
  validateStoredImage: jest.fn().mockResolvedValue(undefined),
}));

const integration =
  process.env.CATALOG_MEDIA_INTEGRATION === "1" ? describe : describe.skip;
integration(
  "catalog media PostgreSQL isolation (metadata only; no Storage objects)",
  () => {
    jest.setTimeout(45000);
    const productIds: string[] = [];
    let foreignVariantId = "";
    beforeAll(async () => {
      for (const suffix of ["a", "b"]) {
        const product = await prisma.product.create({
          data: {
            name: "QA Media Integration",
            slug: `qa-media-integration-${crypto.randomUUID()}-${suffix}`,
          },
        });
        productIds.push(product.id);
      }
      const variant = await prisma.productVariant.create({
        data: {
          productId: productIds[1],
          sku: `QA-MEDIA-${crypto.randomUUID()}`,
          priceCents: 100,
          optionCombinationKey: "",
        },
      });
      foreignVariantId = variant.id;
      await prisma.catalogImage.createMany({
        data: Array.from({ length: 9 }, (_, position) => ({
          productId: productIds[0],
          bucket: "qa-integration-no-files",
          path: `qa/${crypto.randomUUID()}.png`,
          publicUrl: "https://example.invalid/qa.png",
          fileName: `${position}.png`,
          contentType: "image/png",
          size: 16,
          status: "ready",
          position,
        })),
      });
    });
    afterAll(async () => {
      await prisma.catalogImage.updateMany({
        where: { productId: { in: productIds } },
        data: { deletedAt: new Date() },
      });
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { deletedAt: new Date() },
      });
      await prisma.$disconnect();
    });

    it("serializes competing uploads so nine images cannot become eleven", async () => {
      const target = { productId: productIds[0], variantId: null };
      const gallery = await getCatalogGallery(target);
      const result = await Promise.allSettled(
        ["a", "b"].map((name) =>
          prepareCatalogImageUpload({
            ...target,
            revision: gallery.revision,
            fileName: `${name}.png`,
            contentType: "image/png",
            size: 16,
          }).then((ticket) =>
            completeCatalogImageUpload(target, ticket.imageId),
          ),
        ),
      );
      expect(result.filter((item) => item.status === "fulfilled")).toHaveLength(
        1,
      );
      expect(result.filter((item) => item.status === "rejected")).toHaveLength(
        1,
      );
      expect((await getCatalogGallery(target)).images).toHaveLength(10);
    });

    it("rejects stale metadata writes and keeps one order-derived primary", async () => {
      const target = { productId: productIds[0], variantId: null };
      const before = await getCatalogGallery(target);
      const after = await saveCatalogGallery(target, {
        revision: before.revision,
        images: before.images.map((image) => ({
          id: image.id,
          altText: "QA update",
        })),
      });
      expect(after.images.filter((image) => image.isPrimary)).toHaveLength(1);
      await expect(
        saveCatalogGallery(target, { revision: before.revision, images: [] }),
      ).rejects.toMatchObject({ message: "media_conflict" });
    });

    it("enforces variant ownership in PostgreSQL and enables RLS", async () => {
      await expect(
        prisma.catalogImage.create({
          data: {
            productId: productIds[0],
            variantId: foreignVariantId,
            bucket: "qa-integration-no-files",
            path: `qa/${crypto.randomUUID()}.png`,
            publicUrl: "https://example.invalid/qa.png",
            fileName: "foreign.png",
            contentType: "image/png",
            size: 16,
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
      const tables = await prisma.$queryRaw<
        { relrowsecurity: boolean }[]
      >`SELECT relrowsecurity FROM pg_class WHERE oid = 'public."CatalogImage"'::regclass`;
      expect(tables[0]?.relrowsecurity).toBe(true);
    });
  },
);
