/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import {
  getStorefrontCategories,
  getStorefrontListing,
  getStorefrontProduct,
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
      throw new Error("Explicit .env.development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.STOREFRONT_INTEGRATION === "1" ? describe : describe.skip;
integration("public catalog PostgreSQL contract (QA metadata only)", () => {
  jest.setTimeout(60000);
  const categoryIds: string[] = [];
  const productIds: string[] = [];
  const prefix = `qa-public-integration-${crypto.randomUUID()}`;
  let rootId = "",
    childId = "",
    productId = "",
    defaultId = "",
    ownId = "";
  beforeAll(async () => {
    const root = await prisma.category.create({
      data: { name: "QA Public root", slug: prefix + "-root" },
    });
    rootId = root.id;
    categoryIds.push(root.id);
    const child = await prisma.category.create({
      data: {
        name: "QA Public child",
        slug: prefix + "-child",
        parentId: rootId,
      },
    });
    childId = child.id;
    categoryIds.push(child.id);
    const product = await prisma.product.create({
      data: {
        name: "QA Public product",
        slug: prefix + "-product",
        status: "active",
        categories: { create: { categoryId: childId, isPrimary: true } },
        options: {
          create: {
            name: "Finish",
            values: {
              create: [{ value: "One" }, { value: "Two" }, { value: "Hidden" }],
            },
          },
        },
      },
      include: { options: { include: { values: true } } },
    });
    productId = product.id;
    productIds.push(product.id);
    for (const [index, value] of product.options[0].values.entries()) {
      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: `QA-PUBLIC-${crypto.randomUUID()}`,
          priceCents: index === 0 ? 18900000 : 21900000,
          stock: index === 1 ? 0 : 3,
          isActive: index !== 2,
          isDefault: index === 0,
          displayOrder: index,
          optionCombinationKey: value.id,
          optionValues: { create: { optionValueId: value.id } },
        },
      });
      if (index === 0) defaultId = variant.id;
      if (index === 1) ownId = variant.id;
    }
    for (const [variantId, suffix] of [
      [null, "general"],
      [ownId, "own"],
    ])
      await prisma.catalogImage.create({
        data: {
          productId,
          variantId,
          bucket: "qa-metadata-only",
          path: prefix + "-" + suffix,
          publicUrl: `https://example.invalid/${suffix}.png`,
          fileName: `${suffix}.png`,
          contentType: "image/png",
          size: 16,
          status: "ready",
          altText: `QA ${suffix}`,
        },
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
    await prisma.category.updateMany({
      where: { id: { in: categoryIds } },
      data: { deletedAt: new Date() },
    });
    await prisma.$disconnect();
  });
  it("includes descendant products once, keeps exhausted variants visible, and resolves public image fallback", async () => {
    const listing = await getStorefrontListing({
      categorySlug: prefix + "-root",
    });
    expect(listing?.total).toBe(1);
    expect(listing?.items.map((p) => p.id)).toEqual([productId]);
    const product = await getStorefrontProduct(prefix + "-product");
    expect(product?.initialVariantId).toBe(defaultId);
    expect(product?.variants).toHaveLength(2);
    expect(product?.variants.find((v) => v.id === ownId)?.stock).toBe(0);
    expect(product?.options[0].values).toHaveLength(2);
    expect(product?.image?.alt).toBe("QA general");
    expect(product?.variants.find((v) => v.id === ownId)?.images[0].alt).toBe(
      "QA own",
    );
    expect(product?.breadcrumbs.map((c) => c.id)).toEqual([rootId, childId]);
  });
  it("hides draft products and products without active variants", async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { status: "draft" },
    });
    expect(await getStorefrontProduct(prefix + "-product")).toBeNull();
    await prisma.product.update({
      where: { id: productId },
      data: { status: "active" },
    });
    await prisma.productVariant.updateMany({
      where: { productId },
      data: { isActive: false },
    });
    expect(await getStorefrontProduct(prefix + "-product")).toBeNull();
    await prisma.productVariant.updateMany({
      where: { id: { in: [defaultId, ownId] } },
      data: { isActive: true },
    });
  });
  it("blocks both direct child URLs and their products when an ancestor becomes inactive", async () => {
    await prisma.category.update({
      where: { id: rootId },
      data: { isActive: false },
    });
    expect(
      (await getStorefrontCategories()).some((c) => c.id === childId),
    ).toBe(false);
    expect(
      await getStorefrontListing({ categorySlug: prefix + "-child" }),
    ).toBeNull();
    expect(await getStorefrontProduct(prefix + "-product")).toBeNull();
  });
});
