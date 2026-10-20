/** @jest-environment node */
import {
  getCatalogGallery,
  saveCatalogGallery,
} from "@/domains/admin/media/services/catalog_media_service";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { duplicateProduct } from "./duplicate_product_service";
import { updatePriceBatch } from "./price_batch_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.CATALOG_OPERATIONS_INTEGRATION === "1") {
    const parsed = jest
      .requireActual<typeof import("dotenv")>("dotenv")
      .config({ path: ".env.development", override: true, quiet: true }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error("Explicit .env.development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});

const integration =
  process.env.CATALOG_OPERATIONS_INTEGRATION === "1" ? describe : describe.skip;
integration(
  "catalog operations PostgreSQL contract (isolated QA, no Storage operations)",
  () => {
    jest.setTimeout(90000);
    const prefix = `qa-operations-${randomUUID()}`;
    let sourceId = "",
      categoryId = "",
      hiddenCategoryId = "",
      sourceRevision = "";
    const products = new Set<string>();
    const source = () =>
      prisma.product.findUniqueOrThrow({
        where: { id: sourceId },
        include: {
          variants: { orderBy: { id: "asc" } },
          options: {
            orderBy: { id: "asc" },
            include: { values: { orderBy: { id: "asc" } } },
          },
          images: { orderBy: { id: "asc" } },
          costs: { orderBy: { id: "asc" } },
          categories: { orderBy: { id: "asc" } },
        },
      });
    async function copy(copyCosts = false, operationId = randomUUID()) {
      const result = await duplicateProduct(sourceId, {
        operationId,
        copyCosts,
        expectedUpdatedAt: sourceRevision,
      });
      products.add(result.productId);
      return result;
    }
    beforeAll(async () => {
      const category = await prisma.category.create({
        data: { name: prefix, slug: prefix },
      });
      categoryId = category.id;
      const hidden = await prisma.category.create({
        data: {
          name: prefix + " hidden",
          slug: prefix + "-hidden",
          isActive: false,
        },
      });
      hiddenCategoryId = hidden.id;
      const product = await prisma.product.create({
        data: {
          name: prefix,
          slug: prefix,
          status: "active",
          featured: true,
          brand: "QA brand",
          categories: {
            create: [
              { categoryId, isPrimary: true },
              { categoryId: hiddenCategoryId },
            ],
          },
          options: {
            create: {
              name: "Tamaño",
              values: {
                create: [
                  { value: "S" },
                  { value: "M" },
                  { value: "L" },
                  { value: "XL" },
                ],
              },
            },
          },
        },
        include: { options: { include: { values: true } } },
      });
      sourceId = product.id;
      products.add(sourceId);
      sourceRevision = product.updatedAt.toISOString();
      const values = product.options[0].values;
      const ids: string[] = [];
      for (const [i, value] of values.entries()) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: sourceId,
            sku: `${prefix}-${i}`,
            priceCents: 100000 + i * 1000,
            compareAtPriceCents: 200000,
            stock: 10 + i,
            isActive: i !== 2,
            deletedAt: i === 3 ? new Date() : null,
            isDefault: i === 0,
            optionCombinationKey: value.id,
            optionValues: { create: { optionValueId: value.id } },
          },
        });
        ids.push(variant.id);
      }
      const images = [
        { variantId: null, position: 1, status: "ready" },
        { variantId: null, position: 0, status: "ready" },
        { variantId: ids[0], position: 0, status: "ready" },
        { variantId: ids[2], position: 0, status: "ready" },
        { variantId: null, position: 2, status: "pending" },
        { variantId: null, position: 3, status: "failed" },
      ];
      for (const [i, image] of images.entries())
        await prisma.catalogImage.create({
          data: {
            productId: sourceId,
            variantId: image.variantId,
            position: image.position,
            status:
              image.status === "ready"
                ? "ready"
                : image.status === "pending"
                  ? "pending"
                  : "failed",
            bucket: "catalog-public-images",
            path: `catalog/product/${sourceId}/${prefix}-${i}.webp`,
            publicUrl: `https://example.com/${prefix}-${i}.webp`,
            fileName: `qa-${i}.webp`,
            contentType: "image/webp",
            size: 100,
            altText: `QA ${i}`,
          },
        });
      await prisma.catalogCost.createMany({
        data: [
          { productId: sourceId, name: "QA general", amountCents: 100 },
          {
            productId: sourceId,
            variantId: ids[0],
            name: "QA specific",
            amountCents: 200,
          },
          {
            productId: sourceId,
            variantId: ids[2],
            name: "QA inactive",
            amountCents: 300,
          },
          {
            productId: sourceId,
            name: "QA retired",
            amountCents: 400,
            deletedAt: new Date(),
          },
        ],
      });
    });
    afterAll(async () => {
      try {
        const copies = await prisma.catalogDuplication.findMany({
          where: { sourceProductId: sourceId },
          select: { targetProductId: true },
        });
        for (const item of copies) products.add(item.targetProductId);
        const possibleTargets = await prisma.product.findMany({
          where: { slug: { startsWith: prefix + "-copia-" } },
          select: { id: true },
        });
        for (const target of possibleTargets) products.add(target.id);
        const ids = [...products];
        await prisma.catalogCost.updateMany({
          where: { productId: { in: ids } },
          data: { deletedAt: new Date() },
        });
        await prisma.catalogImage.updateMany({
          where: { productId: { in: ids } },
          data: { deletedAt: new Date() },
        });
        await prisma.productVariant.updateMany({
          where: { productId: { in: ids } },
          data: { deletedAt: new Date(), isActive: false },
        });
        await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: new Date(), status: "draft", featured: false },
        });
        await prisma.category.updateMany({
          where: { id: { in: [categoryId, hiddenCategoryId].filter(Boolean) } },
          data: { deletedAt: new Date(), isActive: false },
        });
      } finally {
        await prisma.$disconnect();
      }
    });
    it("creates an independent draft with remapped identities, zero stock, unique SKU and no costs by default", async () => {
      const before = await source();
      const result = await copy();
      expect(result.skippedCategories).toBe(1);
      const target = await prisma.product.findUniqueOrThrow({
        where: { id: result.productId },
        include: {
          variants: { include: { optionValues: true } },
          options: { include: { values: true } },
          images: true,
          costs: true,
          categories: true,
        },
      });
      expect(target).toMatchObject({
        status: "draft",
        featured: false,
        archivedAt: null,
        deletedAt: null,
        brand: before.brand,
      });
      expect(target.slug).not.toBe(before.slug);
      expect(target.costs).toHaveLength(0);
      expect(target.variants).toHaveLength(2);
      expect(target.images).toHaveLength(3);
      expect(target.options[0].id).not.toBe(before.options[0].id);
      const optionIds = target.options.flatMap((option) =>
        option.values.map((value) => value.id),
      );
      for (const variant of target.variants) {
        expect(variant.stock).toBe(0);
        expect(variant.sku).toMatch(/^CP-/);
        expect(before.variants.some((item) => item.sku === variant.sku)).toBe(
          false,
        );
        expect(
          variant.optionValues.every((item) =>
            optionIds.includes(item.optionValueId),
          ),
        ).toBe(true);
      }
      expect(
        target.images.every(
          (image) =>
            !before.images.some((item) => item.id === image.id) &&
            before.images.some((item) => item.path === image.path),
        ),
      ).toBe(true);
      expect(await source()).toEqual(before);
    });
    it("copies costs only explicitly with remapped product/variant ownership and preserves gallery independence", async () => {
      const result = await copy(true);
      const costs = await prisma.catalogCost.findMany({
        where: { productId: result.productId },
        include: { variant: true },
      });
      expect(costs).toHaveLength(2);
      expect(
        costs.every(
          (cost) =>
            cost.variant === null ||
            cost.variant.productId === result.productId,
        ),
      ).toBe(true);
      const original = await getCatalogGallery({
        productId: sourceId,
        variantId: null,
      });
      const gallery = await getCatalogGallery({
        productId: result.productId,
        variantId: null,
      });
      expect(gallery.images.map((image) => image.path)).toEqual(
        original.images.map((image) => image.path),
      );
      await saveCatalogGallery(
        { productId: result.productId, variantId: null },
        {
          revision: gallery.revision,
          images: [
            { id: gallery.images[1].id, altText: "Changed only in copy" },
          ],
        },
      );
      expect(
        await getCatalogGallery({ productId: sourceId, variantId: null }),
      ).toEqual(original);
      const changed = await getCatalogGallery({
        productId: result.productId,
        variantId: null,
      });
      expect(changed.images).toHaveLength(1);
      expect(changed.trash).toHaveLength(1);
      expect(changed.images[0].altText).toBe("Changed only in copy");
    });
    it("replays the same operation instead of creating another copy, including concurrent attempts, and rejects changed intents", async () => {
      const operationId = randomUUID();
      const first = await copy(false, operationId);
      expect(await copy(false, operationId)).toEqual(first);
      await expect(copy(true, operationId)).rejects.toMatchObject({
        message: "operation_key_reused",
      });
      const concurrentId = randomUUID();
      await Promise.allSettled([
        copy(false, concurrentId),
        copy(false, concurrentId),
      ]);
      const final = await copy(false, concurrentId);
      expect(
        await prisma.catalogDuplication.count({
          where: { operationId: concurrentId },
        }),
      ).toBe(1);
      expect(final.productId).not.toBe(first.productId);
    });
    it("rolls back every row on stale revisions or foreign variants, then saves exact prices without touching stock", async () => {
      const result = await copy();
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: result.productId },
        include: { variants: { orderBy: { id: "asc" } } },
      });
      const rows = product.variants.map((variant) => ({
        variantId: variant.id,
        expectedUpdatedAt: variant.updatedAt.toISOString(),
        priceCents: 123456,
        compareAtPriceCents: null,
      }));
      const input = {
        expectedProductUpdatedAt: product.updatedAt.toISOString(),
        rows,
      };
      await expect(
        updatePriceBatch(product.id, {
          ...input,
          rows: rows.map((row, i) =>
            i === 1
              ? { ...row, expectedUpdatedAt: new Date(0).toISOString() }
              : row,
          ),
        }),
      ).rejects.toMatchObject({ message: "variant_revision_conflict" });
      expect(
        await prisma.productVariant.findMany({
          where: { productId: product.id },
          orderBy: { id: "asc" },
        }),
      ).toEqual(product.variants);
      const foreign = (await source()).variants[0];
      await expect(
        updatePriceBatch(product.id, {
          ...input,
          rows: [
            rows[0],
            {
              ...rows[1],
              variantId: foreign.id,
              expectedUpdatedAt: foreign.updatedAt.toISOString(),
            },
          ],
        }),
      ).rejects.toMatchObject({ message: "variant_revision_conflict" });
      expect(await updatePriceBatch(product.id, input)).toEqual({ updated: 2 });
      const updated = await prisma.productVariant.findMany({
        where: { productId: product.id },
      });
      expect(
        updated.every(
          (variant) =>
            variant.stock === 0 &&
            variant.priceCents === 123456 &&
            variant.compareAtPriceCents === null,
        ),
      ).toBe(true);
      await expect(updatePriceBatch(product.id, input)).rejects.toMatchObject({
        message: "variant_revision_conflict",
      });
    });
    it("rolls back a copy that fails after variants and images have been written", async () => {
      const before = await prisma.product.count({
        where: { slug: { startsWith: prefix + "-copia-" } },
      });
      await prisma.catalogCost.createMany({
        data: Array.from({ length: 501 }, () => ({
          productId: sourceId,
          name: "QA over limit",
          amountCents: 1,
        })),
      });
      try {
        await expect(copy(true)).rejects.toMatchObject({
          message: "operation_too_large",
        });
        expect(
          await prisma.product.count({
            where: { slug: { startsWith: prefix + "-copia-" } },
          }),
        ).toBe(before);
      } finally {
        await prisma.catalogCost.updateMany({
          where: { productId: sourceId, name: "QA over limit" },
          data: { deletedAt: new Date() },
        });
      }
    });

    it("allows exactly one concurrent price batch and never mixes their values", async () => {
      const result = await copy();
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: result.productId },
        include: { variants: true },
      });
      const payload = {
        expectedProductUpdatedAt: product.updatedAt.toISOString(),
        rows: product.variants.map((row) => ({
          variantId: row.id,
          expectedUpdatedAt: row.updatedAt.toISOString(),
          priceCents: 100001,
          compareAtPriceCents: null,
        })),
      };
      const results = await Promise.allSettled([
        updatePriceBatch(product.id, payload),
        updatePriceBatch(product.id, {
          ...payload,
          rows: payload.rows.map((row) => ({ ...row, priceCents: 100002 })),
        }),
      ]);
      expect(
        results.filter((item) => item.status === "fulfilled"),
      ).toHaveLength(1);
      const variants = await prisma.productVariant.findMany({
        where: { productId: product.id },
      });
      expect(new Set(variants.map((row) => row.priceCents)).size).toBe(1);
      expect([100001, 100002]).toContain(variants[0].priceCents);
      expect(variants.every((row) => row.stock === 0)).toBe(true);
    });

    it("denies anonymous and ordinary authenticated SQL access to idempotency records", async () => {
      for (const role of ["anon", "authenticated"])
        await expect(
          prisma.$transaction(async (tx) => {
            if (role === "anon") await tx.$executeRaw`SET LOCAL ROLE anon`;
            else await tx.$executeRaw`SET LOCAL ROLE authenticated`;
            return tx.catalogDuplication.findMany();
          }),
        ).rejects.toBeDefined();
    });
    it("rejects stale source data and archived products without leaving incomplete targets", async () => {
      const before = await prisma.catalogDuplication.count({
        where: { sourceProductId: sourceId },
      });
      await expect(
        duplicateProduct(sourceId, {
          operationId: randomUUID(),
          copyCosts: false,
          expectedUpdatedAt: new Date(0).toISOString(),
        }),
      ).rejects.toMatchObject({ message: "product_revision_conflict" });
      await prisma.product.update({
        where: { id: sourceId },
        data: { status: "archived", archivedAt: new Date() },
      });
      await expect(copy()).rejects.toMatchObject({
        message: "product_read_only",
      });
      expect(
        await prisma.catalogDuplication.count({
          where: { sourceProductId: sourceId },
        }),
      ).toBe(before);
    });
  },
);
