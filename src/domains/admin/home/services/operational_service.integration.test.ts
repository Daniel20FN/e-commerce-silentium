/** @jest-environment node */
import { sellableProductWhere } from "@/domains/admin/orders/services/order_catalog";
import {
  createOrder,
  getOrder,
  mutateOrder,
} from "@/domains/admin/orders/services/order_service";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type { PriorityGroup } from "../types/operational";
import {
  getPriorityBlock,
  getPriorityQueue,
  inventoryPriorityWhere,
  orderPriorityWhere,
  productPriorityWhere,
} from "./operational_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.OPERATIONS_INTEGRATION === "1") {
    const parsed = jest
      .requireActual<typeof import("dotenv")>("dotenv")
      .config({ path: ".env.development", override: true, quiet: true }).parsed;
    if (!parsed?.DATABASE_URL)
      throw Error("Explicit development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.OPERATIONS_INTEGRATION === "1" ? describe : describe.skip;
integration("operative queues PostgreSQL contract (isolated QA only)", () => {
  jest.setTimeout(90000);
  const prefix = `qa-home-${randomUUID()}`;
  const products: string[] = [],
    categories: string[] = [],
    orders: string[] = [];
  const actor = { id: "qa-home-actor", label: "QA Inicio operativo" };
  let categoryId = "",
    hiddenId = "",
    parentId = "",
    productId = "",
    stockedVariant = "",
    zeroVariant = "",
    thresholdVariant = "",
    inactiveVariant = "";
  const cases: Record<string, string> = {};
  beforeAll(async () => {
    const visible = await prisma.category.create({
      data: { name: "QA Home visible", slug: prefix },
    });
    categoryId = visible.id;
    categories.push(categoryId);
    const parent = await prisma.category.create({
      data: {
        name: "QA Home hidden parent",
        slug: prefix + "-parent",
        isActive: false,
      },
    });
    parentId = parent.id;
    categories.push(parentId);
    const child = await prisma.category.create({
      data: { name: "QA Home hidden child", slug: prefix + "-child", parentId },
    });
    hiddenId = child.id;
    categories.push(hiddenId);
    const usable = await prisma.product.create({
      data: {
        name: "QA Home usable",
        slug: prefix + "-usable",
        status: "active",
        categories: { create: { categoryId, isPrimary: true } },
        variants: {
          create: [
            {
              sku: prefix + "-stock",
              priceCents: 100000,
              stock: 10,
              optionCombinationKey: "stock",
              isDefault: true,
            },
            {
              sku: prefix + "-zero",
              priceCents: 100000,
              stock: 0,
              optionCombinationKey: "zero",
            },
            {
              sku: prefix + "-threshold",
              priceCents: 100000,
              stock: 2,
              inventoryMinimum: 2,
              optionCombinationKey: "threshold",
            },
            {
              sku: prefix + "-inactive",
              priceCents: 100000,
              stock: 0,
              isActive: false,
              optionCombinationKey: "inactive",
            },
            {
              sku: prefix + "-no-min",
              priceCents: 100000,
              stock: 1,
              optionCombinationKey: "no-min",
            },
            {
              sku: prefix + "-retired",
              priceCents: 100000,
              stock: 0,
              deletedAt: new Date(),
              optionCombinationKey: "retired",
            },
          ],
        },
      },
      include: { variants: true },
    });
    productId = usable.id;
    products.push(productId);
    stockedVariant = usable.variants.find(
      (v) => v.optionCombinationKey === "stock",
    )!.id;
    zeroVariant = usable.variants.find(
      (v) => v.optionCombinationKey === "zero",
    )!.id;
    thresholdVariant = usable.variants.find(
      (v) => v.optionCombinationKey === "threshold",
    )!.id;
    inactiveVariant = usable.variants.find(
      (v) => v.optionCombinationKey === "inactive",
    )!.id;
    for (const kind of [
      "draft",
      "hidden",
      "unavailable",
      "archived",
      "trash",
      "no-variants",
    ]) {
      const record = await prisma.product.create({
        data: {
          name: `QA Home ${kind}`,
          slug: prefix + "-" + kind,
          status:
            kind === "draft"
              ? "draft"
              : kind === "archived"
                ? "archived"
                : "active",
          ...(kind === "trash" ? { deletedAt: new Date() } : {}),
          ...(kind === "archived" ? { archivedAt: new Date() } : {}),
          categories: {
            create: {
              categoryId: kind === "hidden" ? hiddenId : categoryId,
              isPrimary: true,
            },
          },
          ...(kind === "no-variants"
            ? {}
            : {
                variants: {
                  create: {
                    sku: prefix + "-" + kind,
                    priceCents: 100000,
                    stock: kind === "hidden" ? 1 : 0,
                    optionCombinationKey: "",
                    isDefault: true,
                  },
                },
              }),
        },
      });
      products.push(record.id);
      cases[kind] = record.id;
    }
  });
  afterAll(async () => {
    try {
      for (const id of orders) {
        const order = await getOrder(id);
        if (
          order.status === "draft" ||
          (order.status === "confirmed" &&
            ["pending", "preparing", "ready"].includes(order.fulfillment))
        ) {
          await mutateOrder(
            id,
            {
              operationId: randomUUID(),
              expectedRevision: order.revision,
              kind: "cancel",
              reason: "QA home cleanup, isolated order",
            },
            actor,
          );
        } else if (
          order.status === "confirmed" &&
          order.payment === "pending"
        ) {
          await mutateOrder(
            id,
            {
              operationId: randomUUID(),
              expectedRevision: order.revision,
              kind: "payment",
              payment: "paid",
              reason: "QA isolated no real payment",
            },
            actor,
          );
        }
      }
      await prisma.productVariant.updateMany({
        where: { productId: { in: products } },
        data: { deletedAt: new Date(), isActive: false },
      });
      await prisma.product.updateMany({
        where: { id: { in: products } },
        data: {
          deletedAt: new Date(),
          archivedAt: new Date(),
          status: "archived",
        },
      });
      await prisma.category.updateMany({
        where: { id: { in: categories } },
        data: { deletedAt: new Date(), isActive: false },
      });
    } finally {
      await prisma.$disconnect();
    }
  });
  it("shares catalog eligibility including hidden ancestors; distinguishes overlapping drafts and stock-only problems", async () => {
    const publicWhere = await sellableProductWhere(prisma);
    const matches = async (group: "drafts" | "publication" | "unavailable") =>
      (
        await prisma.product.findMany({
          where: {
            AND: [
              productPriorityWhere(group, publicWhere),
              { id: { in: products } },
            ],
          },
          select: { id: true },
        })
      )
        .map((p) => p.id)
        .sort();
    expect(await matches("drafts")).toEqual([cases.draft]);
    expect(await matches("publication")).toEqual(
      [cases.draft, cases.hidden, cases["no-variants"]].sort(),
    );
    expect(await matches("unavailable")).toEqual([cases.unavailable]);
    await prisma.productCategory.create({
      data: { productId: cases.hidden, categoryId, isPrimary: false },
    });
    expect(await matches("publication")).not.toContain(cases.hidden);
    const queues = await getPriorityBlock("catalog");
    for (const queue of queues) {
      if (
        queue.group !== "drafts" &&
        queue.group !== "publication" &&
        queue.group !== "unavailable"
      )
        throw Error();
      expect(queue.count).toBe(
        await prisma.product.count({
          where: productPriorityWhere(queue.group, publicWhere),
        }),
      );
      const full = await getPriorityQueue(queue.group);
      expect(full.count).toBe(queue.count);
    }
  });
  it("counts variants not products, includes stock at threshold and never invents minima or includes retired catalog", async () => {
    const out = await prisma.productVariant.findMany({
      where: { AND: [inventoryPriorityWhere(prisma, "out"), { productId }] },
      select: { id: true },
    });
    expect(out.map((v) => v.id).sort()).toEqual(
      [zeroVariant, inactiveVariant].sort(),
    );
    const low = await prisma.productVariant.findMany({
      where: { AND: [inventoryPriorityWhere(prisma, "low"), { productId }] },
      select: { id: true },
    });
    expect(low.map((v) => v.id)).toEqual([thresholdVariant]);
    for (const group of ["out", "low"] satisfies PriorityGroup[]) {
      if (group !== "out" && group !== "low") throw Error();
      const queue = await getPriorityQueue(group);
      expect(queue.count).toBe(
        await prisma.productVariant.count({
          where: inventoryPriorityWhere(prisma, group),
        }),
      );
      const ids = queue.rows.map((v) => v.id);
      expect(
        await prisma.productVariant.count({
          where: {
            AND: [inventoryPriorityWhere(prisma, group), { id: { in: ids } }],
          },
        }),
      ).toBe(ids.length);
    }
  });
  it("keeps order work after catalog archiving, ignores drafts/cancellations and separates unpaid delivered orders", async () => {
    async function make() {
      const created = await createOrder(
        {
          operationId: randomUUID(),
          customerName: "QA Home Customer",
          customerPhone: "+573000000000",
          delivery: "pickup",
          shippingCents: 0,
          lines: [
            {
              variantId: stockedVariant,
              quantity: 1,
              unitPriceCents: 100000,
              catalogPriceCents: 100000,
            },
          ],
        },
        actor,
      );
      orders.push(created.orderId);
      return getOrder(created.orderId);
    }
    const draft = await make();
    async function transition(
      id: string,
      kind: "confirm" | "fulfillment",
      fulfillment: "preparing" | "ready" | "delivered" = "preparing",
    ) {
      const current = await getOrder(id);
      await mutateOrder(
        id,
        {
          operationId: randomUUID(),
          expectedRevision: current.revision,
          ...(kind === "confirm"
            ? { kind: "confirm" }
            : { kind: "fulfillment", fulfillment }),
        },
        actor,
      );
    }
    const preparing = await make();
    await transition(preparing.id, "confirm");
    const ready = await make();
    await transition(ready.id, "confirm");
    await transition(ready.id, "fulfillment", "preparing");
    await transition(ready.id, "fulfillment", "ready");
    const delivered = await make();
    await transition(delivered.id, "confirm");
    await transition(delivered.id, "fulfillment", "preparing");
    await transition(delivered.id, "fulfillment", "ready");
    await transition(delivered.id, "fulfillment", "delivered");
    await prisma.product.update({
      where: { id: productId },
      data: { status: "archived", archivedAt: new Date() },
    });
    const matches = async (group: "prepare" | "deliver" | "unpaid") =>
      (
        await prisma.manualOrder.findMany({
          where: { ...orderPriorityWhere(group), id: { in: orders } },
          select: { id: true },
        })
      )
        .map((o) => o.id)
        .sort();
    expect(await matches("prepare")).toEqual([preparing.id]);
    expect(await matches("deliver")).toEqual([ready.id]);
    expect(await matches("unpaid")).toEqual(
      [preparing.id, ready.id, delivered.id].sort(),
    );
    expect(await matches("unpaid")).not.toContain(draft.id);
    for (const group of [
      "prepare",
      "deliver",
      "unpaid",
    ] satisfies PriorityGroup[]) {
      if (group !== "prepare" && group !== "deliver" && group !== "unpaid")
        throw Error();
      const queue = await getPriorityQueue(group);
      expect(queue.count).toBe(
        await prisma.manualOrder.count({ where: orderPriorityWhere(group) }),
      );
      expect(JSON.stringify(queue)).not.toContain("QA Home Customer");
    }
  });
  it("paginates a live queue without duplicates and never physically deletes fixtures", async () => {
    for (let i = 0; i < 23; i++) {
      const record = await prisma.product.create({
        data: {
          name: `QA Home page ${i}`,
          slug: `${prefix}-page-${i}`,
          status: "draft",
        },
      });
      products.push(record.id);
    }
    const seen = new Set<string>();
    let cursor: string | undefined;
    let count = 0;
    do {
      const page = await getPriorityQueue("drafts", cursor);
      count = page.count;
      expect(page.rows.length).toBeLessThanOrEqual(20);
      for (const record of page.rows) {
        expect(seen.has(record.id)).toBe(false);
        seen.add(record.id);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.size).toBe(count);
  });
});
