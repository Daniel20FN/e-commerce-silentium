/** @jest-environment node */
import { updateQaStock } from "@/domains/admin/inventory/__fixtures__/update_qa_stock";
import { prisma } from "@/lib/prisma";
import { resolveCart } from "./cart_service";
jest.mock("@/lib/prisma", () => {
  if (process.env.CART_INTEGRATION === "1") {
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
  process.env.CART_INTEGRATION === "1" ? describe : describe.skip;
integration("cart real PostgreSQL public contract", () => {
  jest.setTimeout(60000);
  const prefix = `qa-cart-${crypto.randomUUID()}`;
  let categoryId = "",
    productId = "",
    variantId = "";
  beforeAll(async () => {
    const category = await prisma.category.create({
      data: { name: "QA cart category", slug: prefix },
    });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: {
        name: "QA cart product",
        slug: prefix,
        status: "active",
        categories: { create: { categoryId, isPrimary: true } },
      },
    });
    productId = product.id;
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: prefix,
        optionCombinationKey: "default",
        priceCents: 21900000,
        stock: 4,
        isDefault: true,
      },
    });
    variantId = variant.id;
    await prisma.catalogImage.create({
      data: {
        productId,
        bucket: "qa-metadata-only",
        path: prefix,
        publicUrl: "https://example.invalid/cart.png",
        fileName: "cart.png",
        contentType: "image/png",
        size: 16,
        status: "ready",
        altText: "QA cart photo",
      },
    });
    await prisma.catalogCost.create({
      data: { productId, name: "PRIVATE-CART-COST", amountCents: 999999 },
    });
  });
  afterAll(async () => {
    if (productId) {
      const retired = new Date();
      await prisma.catalogCost.updateMany({
        where: { productId },
        data: { deletedAt: retired },
      });
      await prisma.catalogImage.updateMany({
        where: { productId },
        data: { deletedAt: retired },
      });
      await prisma.productVariant.updateMany({
        where: { productId },
        data: { deletedAt: retired },
      });
      await prisma.product.update({
        where: { id: productId },
        data: { deletedAt: retired },
      });
    }
    if (categoryId)
      await prisma.category.update({
        where: { id: categoryId },
        data: { deletedAt: new Date() },
      });
    await prisma.$disconnect();
  });
  it("uses current price and image fallback, hides costs, never consumes stock", async () => {
    const quote = await resolveCart({ items: [{ variantId, quantity: 2 }] });
    expect(quote).toMatchObject({
      valid: true,
      subtotalCents: 43800000,
      lines: [{ image: { alt: "QA cart photo" } }],
    });
    expect(JSON.stringify(quote)).not.toMatch(
      /PRIVATE-CART-COST|999999|amountCents|margin|costs/,
    );
    expect(
      (
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantId },
        })
      ).stock,
    ).toBe(4);
    await updateQaStock(prisma, variantId, { priceCents: 22000000, stock: 1 });
    const reduced = await resolveCart({ items: [{ variantId, quantity: 2 }] });
    expect(reduced).toMatchObject({
      valid: false,
      subtotalCents: 0,
      lines: [
        {
          quantity: 2,
          priceCents: 22000000,
          maxQuantity: 1,
          status: "insufficient_stock",
        },
      ],
    });
    expect(
      (await resolveCart({ items: [{ variantId, quantity: 1 }] }))
        .subtotalCents,
    ).toBe(22000000);
  });
  it("redacts hidden products and variants, including an inactive category ancestor", async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { archivedAt: new Date() },
    });
    expect(
      (await resolveCart({ items: [{ variantId, quantity: 1 }] })).lines[0],
    ).toMatchObject({
      name: null,
      image: null,
      priceCents: null,
      status: "unavailable",
    });
    await prisma.product.update({
      where: { id: productId },
      data: { archivedAt: null },
    });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
    expect(
      (await resolveCart({ items: [{ variantId, quantity: 1 }] })).valid,
    ).toBe(false);
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: true },
    });
    const parent = await prisma.category.create({
      data: {
        name: "QA hidden ancestor",
        slug: prefix + "-parent",
        isActive: false,
      },
    });
    try {
      await prisma.category.update({
        where: { id: categoryId },
        data: { parentId: parent.id },
      });
      const hidden = await resolveCart({ items: [{ variantId, quantity: 1 }] });
      expect(hidden.lines[0].name).toBeNull();
      expect(hidden.valid).toBe(false);
    } finally {
      await prisma.category.update({
        where: { id: categoryId },
        data: { parentId: null },
      });
      await prisma.category.update({
        where: { id: parent.id },
        data: { deletedAt: new Date() },
      });
    }
  });
});
