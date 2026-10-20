/** @jest-environment node */
import { updateQaStock } from "@/domains/admin/inventory/__fixtures__/update_qa_stock";
import { getStorefrontProduct } from "@/domains/storefront/services/catalog_service";
import { prisma } from "@/lib/prisma";
import { updateAdminProduct } from "./admin_product_service";
import {
  getProductPreview,
  getProductPublication,
} from "./publication_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.PUBLICATION_INTEGRATION === "1") {
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
  process.env.PUBLICATION_INTEGRATION === "1" ? describe : describe.skip;
integration(
  "publication and private projection PostgreSQL contract (isolated QA metadata)",
  () => {
    jest.setTimeout(90000);
    const prefix = `qa-publication-${crypto.randomUUID()}`;
    const categoryIds: string[] = [],
      productIds: string[] = [];
    let rootId = "",
      childId = "",
      fallbackId = "",
      productId = "",
      variantId = "";
    beforeAll(async () => {
      const root = await prisma.category.create({
        data: {
          name: "QA Publication ancestor",
          slug: prefix + "-root",
          isActive: false,
        },
      });
      rootId = root.id;
      categoryIds.push(rootId);
      const child = await prisma.category.create({
        data: {
          name: "QA Publication child",
          slug: prefix + "-child",
          parentId: rootId,
        },
      });
      childId = child.id;
      categoryIds.push(childId);
      const fallback = await prisma.category.create({
        data: { name: "QA Publication visible", slug: prefix + "-visible" },
      });
      fallbackId = fallback.id;
      categoryIds.push(fallbackId);
      const product = await prisma.product.create({
        data: {
          name: "QA Publication draft",
          slug: prefix,
          status: "draft",
          categories: { create: { categoryId: childId, isPrimary: true } },
          variants: {
            create: {
              sku: prefix,
              priceCents: 1000000,
              stock: 2,
              isDefault: true,
              optionCombinationKey: "",
            },
          },
          costs: {
            create: {
              name: "INTERNAL_PRIVATE_COST_SENTINEL",
              amountCents: 123456,
            },
          },
        },
        include: { variants: true },
      });
      productId = product.id;
      productIds.push(productId);
      variantId = product.variants[0].id;
    });
    afterAll(async () => {
      try {
        await prisma.catalogCost.updateMany({
          where: { productId: { in: productIds } },
          data: { deletedAt: new Date() },
        });
        await prisma.productVariant.updateMany({
          where: { productId: { in: productIds } },
          data: { deletedAt: new Date(), isActive: false },
        });
        await prisma.product.updateMany({
          where: { id: { in: productIds } },
          data: { deletedAt: new Date(), status: "draft" },
        });
        await prisma.category.updateMany({
          where: { id: { in: categoryIds } },
          data: { deletedAt: new Date(), isActive: false },
        });
      } finally {
        await prisma.$disconnect();
      }
    });
    it("keeps drafts private, matches ancestor/category/stock policy, prevents stale activation and never projects costs", async () => {
      const preview = await getProductPreview(productId);
      expect(preview?.name).toBe("QA Publication draft");
      expect(JSON.stringify(preview)).not.toMatch(
        /INTERNAL_PRIVATE|amountCents|costs|margin/,
      );
      expect(await getStorefrontProduct(prefix)).toBeNull();
      expect((await getProductPublication(productId))?.issues).toContainEqual({
        code: "no_visible_categories",
        level: "blocker",
        section: "information",
      });
      await prisma.productCategory.create({
        data: { productId, categoryId: fallbackId },
      });
      await prisma.product.update({
        where: { id: productId },
        data: { status: "active" },
      });
      let report = await getProductPublication(productId);
      expect(report).toMatchObject({ visible: true, purchasable: true });
      expect(
        report?.categories.find((category) => category.id === childId)?.visible,
      ).toBe(false);
      expect(report?.issues).toContainEqual({
        code: "hidden_categories",
        level: "warning",
        section: "information",
      });
      expect(await getStorefrontProduct(prefix)).not.toBeNull();
      await updateQaStock(prisma, variantId, { stock: 0 });
      report = await getProductPublication(productId);
      expect(report).toMatchObject({ visible: true, purchasable: false });
      expect((await getStorefrontProduct(prefix))?.available).toBe(false);
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
      expect((await getProductPublication(productId))?.visible).toBe(false);
      expect(await getStorefrontProduct(prefix)).toBeNull();
      expect((await getProductPreview(productId))?.variants).toEqual([]);
      const revision = await prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { updatedAt: true },
      });
      await prisma.product.update({
        where: { id: productId },
        data: { name: "QA Publication newer revision" },
      });
      const payload = {
        name: "QA Publication stale",
        slug: prefix,
        status: "active" as const,
        featured: false,
        categoryIds: [fallbackId],
        primaryCategoryId: fallbackId,
        expectedUpdatedAt: revision.updatedAt.toISOString(),
      };
      await expect(
        updateAdminProduct(productId, payload),
      ).rejects.toMatchObject({
        type: "conflict",
        message: "product_revision_conflict",
      });
      await prisma.product.update({
        where: { id: productId },
        data: { status: "archived", archivedAt: new Date() },
      });
      await expect(
        updateAdminProduct(productId, payload),
      ).rejects.toMatchObject({
        type: "invalid_state",
        message: "product_read_only",
      });
      expect(await getProductPublication(productId)).toMatchObject({
        visible: false,
        purchasable: false,
        readOnly: true,
      });
    });
  },
);
