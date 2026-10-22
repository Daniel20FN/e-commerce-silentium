/** @jest-environment node */
import dictionary from "@/dictionary/es.json";
import {
  createOrder,
  getOrder,
  mutateOrder,
} from "@/domains/admin/orders/services/order_service";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type { AnalysisData, AnalysisKind } from "../types/analysis";
import { analysisWindow } from "./analysis_rules";
import { getAnalysis } from "./analysis_service";
jest.mock("@/lib/prisma", () => {
  if (process.env.ANALYSIS_INTEGRATION === "1") {
    const parsed = jest
      .requireActual<typeof import("dotenv")>("dotenv")
      .config({ path: ".env.development", override: true, quiet: true }).parsed;
    if (!parsed?.DATABASE_URL || process.env.NODE_ENV === "production")
      throw Error("Explicit development database required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.ANALYSIS_INTEGRATION === "1" ? describe : describe.skip;
integration("analysis PostgreSQL aggregates with isolated QA only", () => {
  jest.setTimeout(90000);
  const prefix = `qa-analysis-${randomUUID()}`,
    actor = { id: "qa-analysis-actor", label: "QA Analysis" },
    orders: string[] = [];
  let productId = "",
    categoryId = "",
    variantId = "",
    orderId = "";
  let activityBefore: AnalysisData, inventoryBefore: AnalysisData;
  const agesBefore = new Map<number, AnalysisData>();
  let baseline: { id: string; stock: number }[] = [];
  const copy = dictionary.admin.analysis;
  async function read(
    kind: AnalysisKind,
    offset = 0,
    variants = false,
  ): Promise<AnalysisData> {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + offset);
    const r = await getAnalysis(kind, analysisWindow(30, now), variants, copy);
    if (!r.ok) throw Error("analysis failed");
    return r.data;
  }
  beforeAll(async () => {
    baseline = await prisma.productVariant.findMany({
      select: { id: true, stock: true },
    });
    activityBefore = await read("activity");
    inventoryBefore = await read("inventory");
    for (const offset of [0, 3, 8])
      agesBefore.set(offset, await read("aging", offset));
    categoryId = (
      await prisma.category.create({
        data: { name: "QA Analysis", slug: prefix },
      })
    ).id;
    const p = await prisma.product.create({
      data: {
        name: "QA Analysis isolated",
        slug: prefix,
        status: "active",
        categories: { create: { categoryId, isPrimary: true } },
        variants: {
          create: [
            {
              sku: prefix + "-sale",
              priceCents: 100000,
              stock: 200,
              optionCombinationKey: "sale",
              isDefault: true,
            },
            {
              sku: prefix + "-zero",
              priceCents: 100000,
              stock: 0,
              optionCombinationKey: "zero",
              isActive: false,
            },
            {
              sku: prefix + "-low",
              priceCents: 100000,
              stock: 2,
              inventoryMinimum: 2,
              optionCombinationKey: "low",
            },
            {
              sku: prefix + "-none",
              priceCents: 100000,
              stock: 1,
              optionCombinationKey: "none",
            },
          ],
        },
      },
      include: { variants: true },
    });
    productId = p.id;
    variantId = p.variants.find((v) => v.isDefault)!.id;
    const created = await createOrder(
      {
        operationId: randomUUID(),
        customerName: "QA Analysis",
        customerPhone: "+573000000000",
        delivery: "shipping",
        address: "QA development only",
        shippingCents: 50000,
        lines: [
          {
            variantId,
            quantity: 101,
            unitPriceCents: 75432,
            catalogPriceCents: 100000,
            priceReason: "QA negotiated snapshot",
          },
        ],
      },
      actor,
    );
    orderId = created.orderId;
    orders.push(orderId);
    await mutateOrder(
      orderId,
      {
        operationId: randomUUID(),
        expectedRevision: (await getOrder(orderId)).revision,
        kind: "confirm",
      },
      actor,
    );
  });
  afterAll(async () => {
    try {
      for (const id of orders) {
        const o = await getOrder(id);
        if (o.status !== "cancelled")
          await mutateOrder(
            id,
            {
              operationId: randomUUID(),
              expectedRevision: o.revision,
              kind: "cancel",
              reason: "QA analysis cleanup",
            },
            actor,
          );
      }
      if (productId) {
        await prisma.productVariant.updateMany({
          where: { productId },
          data: { deletedAt: new Date(), isActive: false },
        });
        await prisma.product.update({
          where: { id: productId },
          data: {
            status: "archived",
            archivedAt: new Date(),
            deletedAt: new Date(),
          },
        });
      }
      if (categoryId)
        await prisma.category.update({
          where: { id: categoryId },
          data: { deletedAt: new Date(), isActive: false },
        });
      const after = await prisma.productVariant.findMany({
        where: { id: { in: baseline.map((v) => v.id) } },
        select: { id: true, stock: true },
        orderBy: { id: "asc" },
      });
      expect(after).toEqual(
        [...baseline].sort((a, b) => a.id.localeCompare(b.id)),
      );
    } finally {
      await prisma.$disconnect();
    }
  });
  it("uses negotiated merchandise subtotal, excludes shipping and returns bounded calendar rows", async () => {
    const r = await read("activity");
    expect(r.total - activityBefore.total).toBe(1);
    expect(r.cents - activityBefore.cents).toBe(101 * 75432);
    expect(r.points).toHaveLength(30);
    const lines = await read("top", 0, true);
    expect(lines.points.find((p) => p.id === variantId)?.count).toBe(101);
    expect(JSON.stringify(lines)).not.toContain("customerPhone");
  });
  it("partitions current inventory including inactive and unconfigured minimums", async () => {
    const r = await read("inventory");
    expect(r.total - inventoryBefore.total).toBe(4);
    for (const id of ["out", "low"])
      expect(
        r.points.find((p) => p.id === id)!.count -
          inventoryBefore.points.find((p) => p.id === id)!.count,
      ).toBe(1);
    expect(r.points.reduce((s, p) => s + p.count, 0)).toBe(r.total);
  });
  it("ages by Colombia calendar and preserves historical chart rows after archival", async () => {
    for (const [offset, bucket] of [
      [0, "0"],
      [3, "3"],
      [8, "8"],
    ] as const) {
      const r = await read("aging", offset);
      expect(
        r.points.find((p) => p.id === bucket)!.count -
          agesBefore.get(offset)!.points.find((p) => p.id === bucket)!.count,
      ).toBe(1);
    }
    await prisma.product.update({
      where: { id: productId },
      data: { status: "archived", archivedAt: new Date() },
    });
    const r = await read("top");
    expect(r.points.find((p) => p.id === productId)?.count).toBe(101);
    expect((await read("activity")).total - activityBefore.total).toBe(1);
  });
  it("keeps day buckets identical in a non-UTC PostgreSQL session", async () => {
    const w = analysisWindow(30, new Date());
    const expected = await getAnalysis("activity", w, false, copy);
    expect(expected.ok).toBe(true);
    const original = prisma.$transaction.bind(prisma);
    const spy = jest
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (cb) => {
        if (typeof cb !== "function")
          throw Error("Expected interactive transaction");
        return original(
          async (tx) => {
            await tx.$executeRaw`SET LOCAL TIME ZONE 'Pacific/Auckland'`;
            return cb(tx);
          },
          { timeout: 15000 },
        );
      });
    try {
      expect(await getAnalysis("activity", w, false, copy)).toEqual(expected);
    } finally {
      spy.mockRestore();
    }
  });
  it("excludes cancellations from historical confirmation cohort", async () => {
    await mutateOrder(
      orderId,
      {
        operationId: randomUUID(),
        expectedRevision: (await getOrder(orderId)).revision,
        kind: "cancel",
        reason: "QA analysis cancellation",
      },
      actor,
    );
    expect((await read("activity")).total).toBe(activityBefore.total);
    expect((await read("top")).points.some((p) => p.id === productId)).toBe(
      false,
    );
  });
});
