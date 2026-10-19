/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  changeCatalogCostState,
  createCatalogCost,
  getCatalogCosts,
  updateCatalogCost,
} from "./cost_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.CATALOG_COSTS_INTEGRATION === "1") {
    const dotenv = jest.requireActual<typeof import("dotenv")>("dotenv");
    const parsed = dotenv.config({
      path: ".env.development",
      override: true,
      quiet: true,
    }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error(
        "Costs integration requires DATABASE_URL explicitly in .env.development",
      );
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.CATALOG_COSTS_INTEGRATION === "1" ? describe : describe.skip;
integration("costs PostgreSQL isolation, recovery and concurrency", () => {
  jest.setTimeout(90000);
  const products: string[] = [];
  const variants: string[] = [];
  beforeAll(async () => {
    for (const suffix of ["a", "b"]) {
      const product = await prisma.product.create({
        data: {
          name: "QA Costs Integration",
          slug: `qa-cost-integration-${crypto.randomUUID()}-${suffix}`,
        },
      });
      products.push(product.id);
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `QA-COST-${crypto.randomUUID()}`,
          priceCents: 10000000,
          stock: 1,
          optionCombinationKey: "",
        },
      });
      variants.push(variant.id);
    }
  });
  beforeEach(async () => {
    await prisma.catalogCost.updateMany({
      where: { productId: { in: products }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  });
  afterAll(async () => {
    try {
      await prisma.catalogCost.updateMany({
        where: { productId: { in: products } },
        data: { deletedAt: new Date() },
      });
      await prisma.productVariant.updateMany({
        where: { productId: { in: products } },
        data: { deletedAt: new Date(), isActive: false, isDefault: false },
      });
      await prisma.product.updateMany({
        where: { id: { in: products } },
        data: { deletedAt: new Date() },
      });
    } finally {
      await prisma.$disconnect();
    }
  });
  it("sums per-unit common and specific costs; never allocates across stock", async () => {
    await createCatalogCost(products[0], {
      variantId: null,
      name: "Tela",
      description: "Por unidad",
      amountCents: 7000000,
    });
    const result = await createCatalogCost(products[0], {
      variantId: variants[0],
      name: "Extra",
      description: null,
      amountCents: 1000000,
    });
    expect(result.summaries[variants[0]]).toMatchObject({
      totalCents: 8000000,
      marginCents: 2000000,
      marginPercent: 20,
      hasCosts: true,
    });
    expect((await getCatalogCosts(products[1])).items).toHaveLength(0);
  });
  it("updates current value only, soft deletes and restores with recalculation", async () => {
    const created = await createCatalogCost(products[0], {
      variantId: null,
      name: "Confección",
      description: null,
      amountCents: 2000000,
    });
    const item = created.items.find((cost) => !cost.deletedAt)!;
    const edited = await updateCatalogCost(products[0], {
      id: item.id,
      variantId: item.variantId,
      description: item.description,
      revision: item.revision,
      name: "Confección actual",
      amountCents: 3000000,
    });
    const current = edited.items.find((cost) => cost.id === item.id)!;
    expect(edited.summaries[variants[0]].totalCents).toBe(3000000);
    const removed = await changeCatalogCostState(products[0], {
      id: current.id,
      revision: current.revision,
      action: "trash",
    });
    expect(removed.summaries[variants[0]].hasCosts).toBe(false);
    const trashed = removed.items.find((cost) => cost.id === current.id)!;
    const restored = await changeCatalogCostState(products[0], {
      id: trashed.id,
      revision: trashed.revision,
      action: "restore",
    });
    expect(restored.summaries[variants[0]].totalCents).toBe(3000000);
    expect(await prisma.catalogCost.count({ where: { id: item.id } })).toBe(1);
  });
  it("rejects foreign target/cost and enforces composite FK even outside service", async () => {
    await expect(
      createCatalogCost(products[0], {
        variantId: variants[1],
        name: "Foreign",
        description: null,
        amountCents: 100,
      }),
    ).rejects.toMatchObject({ message: "cost_variant_unavailable" });
    await expect(
      prisma.catalogCost.create({
        data: {
          productId: products[0],
          variantId: variants[1],
          name: "Foreign SQL",
          amountCents: 100,
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
    const created = await createCatalogCost(products[1], {
      variantId: null,
      name: "Private",
      description: null,
      amountCents: 100,
    });
    const item = created.items.find((cost) => !cost.deletedAt)!;
    await expect(
      changeCatalogCostState(products[0], {
        id: item.id,
        revision: item.revision,
        action: "trash",
      }),
    ).rejects.toMatchObject({ type: "not_found" });
  });
  it("serializes concurrent edits and accepts exactly one stale revision", async () => {
    const created = await createCatalogCost(products[0], {
      variantId: null,
      name: "Concurrent",
      description: null,
      amountCents: 100,
    });
    const item = created.items.find((cost) => !cost.deletedAt)!;
    const input = {
      id: item.id,
      revision: item.revision,
      variantId: null,
      name: item.name,
      description: null,
    };
    const results = await Promise.allSettled([
      updateCatalogCost(products[0], { ...input, amountCents: 200 }),
      updateCatalogCost(products[0], { ...input, amountCents: 300 }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected"),
    ).toMatchObject({ reason: { message: "cost_conflict" } });
  });
  it("blocks retired parents and variants; anonymous SQL cannot read costs", async () => {
    await prisma.productVariant.update({
      where: { id: variants[0] },
      data: { deletedAt: new Date() },
    });
    try {
      await expect(
        createCatalogCost(products[0], {
          variantId: variants[0],
          name: "Blocked",
          description: null,
          amountCents: 100,
        }),
      ).rejects.toMatchObject({ message: "cost_variant_unavailable" });
    } finally {
      await prisma.productVariant.update({
        where: { id: variants[0] },
        data: { deletedAt: null },
      });
    }
    await prisma.product.update({
      where: { id: products[0] },
      data: { archivedAt: new Date() },
    });
    try {
      expect((await getCatalogCosts(products[0])).writable).toBe(false);
      await expect(
        createCatalogCost(products[0], {
          variantId: null,
          name: "Blocked",
          description: null,
          amountCents: 100,
        }),
      ).rejects.toMatchObject({ message: "cost_parent_unavailable" });
    } finally {
      await prisma.product.update({
        where: { id: products[0] },
        data: { archivedAt: null },
      });
    }
    await createCatalogCost(products[0], {
      variantId: null,
      name: "Confidential",
      description: null,
      amountCents: 123,
    });
    const result = await prisma
      .$transaction(async (db) => {
        await db.$executeRaw`SET LOCAL ROLE anon`;
        return db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CatalogCost"`;
      })
      .then((rows) => ({ rows, denied: false }))
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.meta?.code === "42501"
        )
          return { rows: [], denied: true };
        throw error;
      });
    expect(result.rows).toHaveLength(0);
    const [security] = await prisma.$queryRaw<
      { relrowsecurity: boolean }[]
    >`SELECT relrowsecurity FROM pg_class WHERE oid='"CatalogCost"'::regclass`;
    expect(security.relrowsecurity).toBe(true);
  });
});
