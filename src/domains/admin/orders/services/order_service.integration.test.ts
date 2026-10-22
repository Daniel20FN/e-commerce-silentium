/** @jest-environment node */
import { mutateInventory } from "@/domains/admin/inventory/services/inventory_service";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type {
  CreateOrderParams,
  OrderMutationParams,
} from "../types/api_params";
import {
  createOrder,
  getOrder,
  mutateOrder,
  saveOrderDraft,
  searchOrderVariants,
} from "./order_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.ORDERS_INTEGRATION === "1") {
    const parsed = jest
      .requireActual<typeof import("dotenv")>("dotenv")
      .config({ path: ".env.development", override: true, quiet: true }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error("Explicit development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.ORDERS_INTEGRATION === "1" ? describe : describe.skip;
integration("manual orders PostgreSQL contract (isolated QA metadata)", () => {
  jest.setTimeout(90000);
  type OrderAction<T = OrderMutationParams> = T extends OrderMutationParams
    ? Omit<T, "operationId" | "expectedRevision">
    : never;
  const actor = { id: "qa-orders-actor", label: "QA Manual Orders" };
  const productIds: string[] = [],
    categoryIds: string[] = [],
    orderIds: string[] = [];
  let productId = "",
    variantId = "",
    otherVariantId = "",
    categoryId = "",
    parentId = "";
  const stock = (id = variantId) =>
    prisma.productVariant.findUniqueOrThrow({ where: { id } });
  const draft = (quantity = 2): CreateOrderParams => ({
    operationId: randomUUID(),
    customerName: "QA Isolated Customer",
    customerPhone: "+573000000000",
    delivery: "shipping",
    address: "QA no shipment: isolated address",
    shippingCents: 12000,
    lines: [
      {
        variantId,
        quantity,
        unitPriceCents: 100000,
        catalogPriceCents: 100000,
      },
    ],
  });
  async function create(params = draft()) {
    const result = await createOrder(params, actor);
    orderIds.push(result.orderId);
    return getOrder(result.orderId);
  }
  async function change(id: string, action: OrderAction) {
    const current = await getOrder(id);
    await mutateOrder(
      id,
      {
        ...action,
        operationId: randomUUID(),
        expectedRevision: current.revision,
      },
      actor,
    );
    return getOrder(id);
  }
  async function confirm(quantity = 2) {
    const order = await create(draft(quantity));
    return change(order.id, { kind: "confirm" });
  }
  async function ship(id: string) {
    await change(id, { kind: "fulfillment", fulfillment: "preparing" });
    return change(id, { kind: "fulfillment", fulfillment: "shipped" });
  }
  beforeEach(async () => {
    const id = randomUUID();
    const parent = await prisma.category.create({
      data: { name: `QA orders parent ${id}`, slug: `qa-orders-parent-${id}` },
    });
    parentId = parent.id;
    categoryIds.push(parentId);
    const category = await prisma.category.create({
      data: {
        name: `QA orders category ${id}`,
        slug: `qa-orders-category-${id}`,
        parentId,
      },
    });
    categoryId = category.id;
    categoryIds.push(categoryId);
    const records = [];
    for (let i = 0; i < 2; i++) {
      const product = await prisma.product.create({
        data: {
          name: `QA orders product ${id}-${i}`,
          slug: `qa-orders-${id}-${i}`,
          status: "active",
          categories: { create: { categoryId, isPrimary: true } },
          variants: {
            create: {
              sku: `QA-ORDER-${id}-${i}`,
              priceCents: 100000,
              stock: 10,
              isDefault: true,
              optionCombinationKey: "",
            },
          },
          costs: {
            create: {
              name: "QA_ORDERS_PRIVATE_COST_SENTINEL",
              amountCents: 45678,
            },
          },
          images: {
            create: {
              bucket: "qa-no-storage-upload",
              path: `qa-orders/${id}/${i}.webp`,
              publicUrl: `https://example.com/qa-orders/${id}/${i}.webp`,
              fileName: "qa.webp",
              contentType: "image/webp",
              size: 100,
              status: "ready",
            },
          },
        },
        include: { variants: true },
      });
      productIds.push(product.id);
      records.push(product);
    }
    productId = records[0].id;
    [variantId, otherVariantId] = records.map((p) => p.variants[0].id);
  });
  afterAll(async () => {
    try {
      // History is deliberately retained. Retire only this suite's catalog metadata.
      await prisma.catalogCost.updateMany({
        where: { productId: { in: productIds } },
        data: { deletedAt: new Date() },
      });
      await prisma.catalogImage.updateMany({
        where: { productId: { in: productIds } },
        data: { deletedAt: new Date() },
      });
      await prisma.productVariant.updateMany({
        where: { productId: { in: productIds } },
        data: { deletedAt: new Date(), isActive: false },
      });
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: {
          deletedAt: new Date(),
          status: "archived",
          archivedAt: new Date(),
        },
      });
      await prisma.category.updateMany({
        where: { id: { in: categoryIds } },
        data: { deletedAt: new Date(), isActive: false },
      });
    } finally {
      await prisma.$disconnect();
    }
  });
  it("creates private COP drafts and edits without reserving stock; creation replay is actor/body bound", async () => {
    const params = draft();
    const order = await create(params);
    expect(order).toMatchObject({
      status: "draft",
      payment: "pending",
      subtotalCents: 200000,
      shippingCents: 12000,
      totalCents: 212000,
      createdByLabel: actor.label,
    });
    expect((await stock()).stock).toBe(10);
    expect(await createOrder(params, actor)).toMatchObject({
      orderId: order.id,
    });
    await expect(
      createOrder({ ...params, customerName: "Changed customer" }, actor),
    ).rejects.toThrow();
    await expect(
      createOrder(params, { ...actor, id: "qa-other-actor" }),
    ).rejects.toThrow();
    await saveOrderDraft(
      order.id,
      { ...draft(3), expectedRevision: order.revision },
      actor,
    );
    const edited = await getOrder(order.id);
    expect(edited.subtotalCents).toBe(300000);
    expect(edited.events.map((e) => e.kind)).toEqual(
      expect.arrayContaining(["created", "edited"]),
    );
    expect((await stock()).stock).toBe(10);
    expect(JSON.stringify(edited)).not.toContain(
      "QA_ORDERS_PRIVATE_COST_SENTINEL",
    );
    expect(JSON.stringify(edited)).not.toContain("45678");
  });
  it("confirms multiple products atomically with immutable snapshots, actors and typed stock links", async () => {
    const option = await prisma.productOption.create({
      data: {
        productId,
        name: "QA snapshot color",
        values: { create: { value: "Original sky" } },
      },
      include: { values: true },
    });
    const optionValue = option.values[0];
    await prisma.productVariantOptionValue.create({
      data: { productVariantId: variantId, optionValueId: optionValue.id },
    });
    const params = draft();
    params.lines.push({
      variantId: otherVariantId,
      quantity: 3,
      unitPriceCents: 100000,
      catalogPriceCents: 100000,
    });
    const order = await create(params);
    const confirmed = await change(order.id, { kind: "confirm" });
    expect(confirmed.status).toBe("confirmed");
    expect((await stock()).stock).toBe(8);
    expect((await stock(otherVariantId)).stock).toBe(7);
    const links = await prisma.orderStockLink.findMany({
      where: { orderId: order.id },
      include: { movement: true },
    });
    expect(links).toHaveLength(2);
    expect(
      links.every(
        (l) =>
          l.purpose === "confirmation" &&
          l.movement.type === "exit" &&
          l.movement.actorId === actor.id,
      ),
    ).toBe(true);
    await prisma.product.update({
      where: { id: productId },
      data: { name: "QA renamed catalog" },
    });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { priceCents: 250000, sku: `QA-RENAMED-${randomUUID()}` },
    });
    expect(
      confirmed.lines.find((line) => line.variantId === variantId)?.attributes,
    ).toContain("Original sky");
    await prisma.productOptionValue.update({
      where: { id: optionValue.id },
      data: { value: "Changed catalog color" },
    });
    expect((await getOrder(order.id)).lines).toEqual(confirmed.lines);
    await expect(
      saveOrderDraft(
        order.id,
        { ...draft(), expectedRevision: confirmed.revision },
        actor,
      ),
    ).rejects.toThrow();
  });
  it("rolls back every stock line and operation on insufficient stock or stale order revision", async () => {
    const params = draft(2);
    // Force one valid stock write before the insufficient line in deterministic lock order.
    params.lines = [variantId, otherVariantId].sort().map((id, index) => ({
      variantId: id,
      quantity: index === 0 ? 2 : 11,
      unitPriceCents: 100000,
      catalogPriceCents: 100000,
    }));
    const order = await create(params);
    const command: OrderMutationParams = {
      kind: "confirm",
      operationId: randomUUID(),
      expectedRevision: order.revision,
    };
    await expect(mutateOrder(order.id, command, actor)).rejects.toThrow();
    expect((await stock()).stock).toBe(10);
    expect((await stock(otherVariantId)).stock).toBe(10);
    expect(
      await prisma.orderOperation.count({ where: { id: command.operationId } }),
    ).toBe(0);
    expect((await getOrder(order.id)).status).toBe("draft");
    await saveOrderDraft(
      order.id,
      { ...draft(), expectedRevision: order.revision },
      actor,
    );
    await expect(
      mutateOrder(order.id, { ...command, operationId: randomUUID() }, actor),
    ).rejects.toThrow();
    expect((await stock()).stock).toBe(10);
  });
  it("concurrent distinct orders cannot oversell a shared variant", async () => {
    const a = await create(draft(7)),
      b = await create(draft(7));
    const results = await Promise.allSettled(
      [a, b].map((o) =>
        mutateOrder(
          o.id,
          {
            kind: "confirm",
            operationId: randomUUID(),
            expectedRevision: o.revision,
          },
          actor,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await stock()).stock).toBe(3);
    expect(
      await prisma.orderStockLink.count({
        where: { orderId: { in: [a.id, b.id] }, purpose: "confirmation" },
      }),
    ).toBe(1);
  });
  it("same confirmation operation replays once across concurrency and rejects changed actor, revision or body", async () => {
    const order = await create();
    const command: OrderMutationParams = {
      kind: "confirm",
      operationId: randomUUID(),
      expectedRevision: order.revision,
    };
    const result = await Promise.all([
      mutateOrder(order.id, command, actor),
      mutateOrder(order.id, command, actor),
    ]);
    expect(result[0]).toEqual(result[1]);
    await expect(
      mutateOrder(order.id, command, { ...actor, id: "qa-other-actor" }),
    ).rejects.toThrow();
    await expect(
      mutateOrder(
        order.id,
        { ...command, expectedRevision: order.revision + 1 },
        actor,
      ),
    ).rejects.toThrow();
    await expect(
      mutateOrder(
        order.id,
        {
          operationId: command.operationId,
          expectedRevision: order.revision,
          kind: "payment",
          payment: "paid",
        },
        actor,
      ),
    ).rejects.toThrow();
    expect((await stock()).stock).toBe(8);
    expect(
      await prisma.orderStockLink.count({ where: { orderId: order.id } }),
    ).toBe(1);
    const current = await getOrder(order.id);
    await expect(
      mutateOrder(
        order.id,
        {
          ...command,
          operationId: randomUUID(),
          expectedRevision: current.revision,
        },
        actor,
      ),
    ).rejects.toThrow();
  });
  it("requires review after catalog-price changes and a reason for negotiated prices", async () => {
    const order = await create();
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { priceCents: 110000 },
    });
    await expect(change(order.id, { kind: "confirm" })).rejects.toThrow();
    expect((await stock()).stock).toBe(10);
    const refreshed = draft();
    refreshed.lines[0].catalogPriceCents = 110000;
    await expect(
      saveOrderDraft(
        order.id,
        { ...refreshed, expectedRevision: order.revision },
        actor,
      ),
    ).rejects.toThrow();
    refreshed.lines[0].priceReason = "QA negotiated WhatsApp price";
    await saveOrderDraft(
      order.id,
      { ...refreshed, expectedRevision: order.revision },
      actor,
    );
    const confirmed = await change(order.id, { kind: "confirm" });
    expect(confirmed.lines[0]).toMatchObject({
      unitPriceCents: 100000,
      catalogPriceCents: 110000,
      priceReason: "QA negotiated WhatsApp price",
    });
  });
  it("revalidates ancestor visibility, lifecycle and inactive variants before confirmation", async () => {
    const order = await create();
    await prisma.category.update({
      where: { id: parentId },
      data: { isActive: false },
    });
    await expect(change(order.id, { kind: "confirm" })).rejects.toThrow();
    await prisma.category.update({
      where: { id: parentId },
      data: { isActive: true },
    });
    for (const status of ["draft", "archived"] as const) {
      await prisma.product.update({
        where: { id: productId },
        data: { status },
      });
      await expect(change(order.id, { kind: "confirm" })).rejects.toThrow();
    }
    await prisma.product.update({
      where: { id: productId },
      data: { status: "active", deletedAt: new Date() },
    });
    await expect(change(order.id, { kind: "confirm" })).rejects.toThrow();
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: null },
    });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
    await expect(change(order.id, { kind: "confirm" })).rejects.toThrow();
    expect((await stock()).stock).toBe(10);
  });
  it("picker excludes hidden variants and projects only operational public catalog fields", async () => {
    const record = await stock();
    const results = await searchOrderVariants({ search: record.sku });
    expect(results.variants).toHaveLength(1);
    expect(results.variants[0]).toMatchObject({
      id: variantId,
      stock: 10,
      priceCents: 100000,
    });
    expect(JSON.stringify(results)).not.toContain(
      "QA_ORDERS_PRIVATE_COST_SENTINEL",
    );
    expect(JSON.stringify(results)).not.toContain("45678");
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });
    expect(
      (await searchOrderVariants({ search: record.sku })).variants,
    ).toEqual([]);
  });
  it("payment is independent from stock/confirmation and correction requires a reason", async () => {
    let order = await create();
    order = await change(order.id, { kind: "payment", payment: "paid" });
    expect(order).toMatchObject({ payment: "paid", status: "draft" });
    expect((await stock()).stock).toBe(10);
    await expect(
      change(order.id, { kind: "payment", payment: "pending" }),
    ).rejects.toThrow();
    order = await change(order.id, {
      kind: "payment",
      payment: "pending",
      reason: "QA wrong payment declaration",
    });
    expect(
      order.events.find((e) => e.kind === "payment" && e.to === "pending"),
    ).toMatchObject({
      actorLabel: actor.label,
      reason: "QA wrong payment declaration",
    });
    order = await change(order.id, { kind: "confirm" });
    expect(order).toMatchObject({ status: "confirmed", payment: "pending" });
    order = await change(order.id, { kind: "payment", payment: "paid" });
    expect((await stock()).stock).toBe(8);
    order = await change(order.id, {
      kind: "cancel",
      reason: "QA customer cancellation before shipping",
    });
    expect(order).toMatchObject({ status: "cancelled", payment: "paid" });
    expect((await stock()).stock).toBe(10);
  });
  it("shipping fulfillment is forward-only and cancellation after physical exit is blocked", async () => {
    let order = await confirm();
    await expect(
      change(order.id, { kind: "fulfillment", fulfillment: "shipped" }),
    ).rejects.toThrow();
    order = await ship(order.id);
    await expect(
      change(order.id, { kind: "fulfillment", fulfillment: "ready" }),
    ).rejects.toThrow();
    await expect(
      change(order.id, { kind: "fulfillment", fulfillment: "preparing" }),
    ).rejects.toThrow();
    await expect(
      change(order.id, { kind: "cancel", reason: "QA too late" }),
    ).rejects.toThrow();
    order = await change(order.id, {
      kind: "fulfillment",
      fulfillment: "delivered",
    });
    await expect(
      change(order.id, { kind: "cancel", reason: "QA already delivered" }),
    ).rejects.toThrow();
    expect((await stock()).stock).toBe(8);
  });
  it("pickup uses ready instead of shipped and cancellation while ready restores stock exactly once", async () => {
    const params = {
      ...draft(),
      delivery: "pickup" as const,
      shippingCents: 0,
      address: undefined,
    };
    let order = await create(params);
    order = await change(order.id, { kind: "confirm" });
    order = await change(order.id, {
      kind: "fulfillment",
      fulfillment: "preparing",
    });
    await expect(
      change(order.id, { kind: "fulfillment", fulfillment: "shipped" }),
    ).rejects.toThrow();
    order = await change(order.id, {
      kind: "fulfillment",
      fulfillment: "ready",
    });
    const command: OrderMutationParams = {
      kind: "cancel",
      reason: "QA pickup abandoned",
      operationId: randomUUID(),
      expectedRevision: order.revision,
    };
    await mutateOrder(order.id, command, actor);
    await mutateOrder(order.id, command, actor);
    expect((await stock()).stock).toBe(10);
    expect(
      await prisma.orderStockLink.count({
        where: { orderId: order.id, purpose: "cancellation" },
      }),
    ).toBe(1);
    await expect(
      change(order.id, { kind: "cancel", reason: "QA repeat" }),
    ).rejects.toThrow();
  });
  it("draft cancellation never creates replenishment and confirmed cancellation survives catalog archival/trash", async () => {
    const draftOrder = await create();
    await change(draftOrder.id, {
      kind: "cancel",
      reason: "QA draft abandoned",
    });
    expect(
      await prisma.orderStockLink.count({ where: { orderId: draftOrder.id } }),
    ).toBe(0);
    const order = await confirm();
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: "archived",
        deletedAt: new Date(),
        archivedAt: new Date(),
      },
    });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false },
    });
    await change(order.id, {
      kind: "cancel",
      reason: "QA historical cancellation",
    });
    expect((await stock()).stock).toBe(10);
  });
  it("partial returns distinguish received/resellable, preserve delivery/payment and enforce cumulative sold limits", async () => {
    let order = await confirm(5);
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA not yet dispatched",
        rows: [{ lineId: order.lines[0].id, received: 1, resellable: 1 }],
      }),
    ).rejects.toThrow();
    order = await ship(order.id);
    order = await change(order.id, {
      kind: "fulfillment",
      fulfillment: "delivered",
    });
    order = await change(order.id, { kind: "payment", payment: "paid" });
    const lineId = order.lines[0].id;
    const command: OrderMutationParams = {
      kind: "return",
      operationId: randomUUID(),
      expectedRevision: order.revision,
      reason: "QA physical partial return",
      rows: [{ lineId, received: 3, resellable: 2 }],
    };
    await mutateOrder(order.id, command, actor);
    await mutateOrder(order.id, command, actor);
    expect((await stock()).stock).toBe(7);
    order = await getOrder(order.id);
    expect(order).toMatchObject({
      status: "confirmed",
      fulfillment: "delivered",
      payment: "paid",
    });
    expect(order.lines[0]).toMatchObject({ received: 3, resellable: 2 });
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA over received",
        rows: [{ lineId, received: 3, resellable: 1 }],
      }),
    ).rejects.toThrow();
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA not physically received",
        rows: [{ lineId, received: 1, resellable: 2 }],
      }),
    ).rejects.toThrow();
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: "archived" },
    });
    order = await change(order.id, {
      kind: "return",
      reason: "QA received damaged remainder",
      rows: [{ lineId, received: 2, resellable: 0 }],
    });
    expect(order.lines[0]).toMatchObject({ received: 5, resellable: 2 });
    expect((await stock()).stock).toBe(7);
    expect(
      await prisma.orderStockLink.count({
        where: { orderId: order.id, purpose: "return" },
      }),
    ).toBe(1);
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA extra return",
        rows: [{ lineId, received: 1, resellable: 0 }],
      }),
    ).rejects.toThrow();
  });
  it("return lines are scoped to the original order and a failed multi-line return is atomic", async () => {
    const params = draft(3);
    params.lines.push({
      variantId: otherVariantId,
      quantity: 2,
      unitPriceCents: 100000,
      catalogPriceCents: 100000,
    });
    let order = await create(params);
    order = await change(order.id, { kind: "confirm" });
    order = await ship(order.id);
    const foreign = await create();
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA cross order",
        rows: [{ lineId: foreign.lines[0].id, received: 1, resellable: 1 }],
      }),
    ).rejects.toThrow();
    const first = order.lines.find((l) => l.variantId === variantId);
    const second = order.lines.find((l) => l.variantId === otherVariantId);
    if (!first || !second) throw new Error("QA expected both order lines");
    await expect(
      change(order.id, {
        kind: "return",
        reason: "QA atomic rollback",
        rows: [
          { lineId: first.id, received: 1, resellable: 1 },
          { lineId: second.id, received: 3, resellable: 1 },
        ],
      }),
    ).rejects.toThrow();
    expect((await stock()).stock).toBe(7);
    expect((await stock(otherVariantId)).stock).toBe(8);
    expect(
      (await getOrder(order.id)).lines.every((l) => l.received === 0),
    ).toBe(true);
  });
  it("generic inventory reversal cannot undo an order-linked movement", async () => {
    const order = await confirm();
    const link = await prisma.orderStockLink.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const current = await stock();
    await expect(
      mutateInventory(
        productId,
        {
          operationId: randomUUID(),
          kind: "reversal",
          rows: [
            {
              variantId,
              expectedRevision: current.stockRevision,
              quantity: 0,
              reason: "QA generic reversal attempt",
              reversesId: link.movementId,
            },
          ],
        },
        actor,
      ),
    ).rejects.toThrow();
    expect((await stock()).stock).toBe(8);
  });
  it("confirmed lines, events, operations, returns and stock links are immutable and private to SQL roles", async () => {
    let order = await confirm();
    order = await ship(order.id);
    order = await change(order.id, {
      kind: "return",
      reason: "QA immutable return",
      rows: [{ lineId: order.lines[0].id, received: 1, resellable: 1 }],
    });
    const event = await prisma.orderEvent.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const operation = await prisma.orderOperation.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const link = await prisma.orderStockLink.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const returned = await prisma.orderReturn.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await expect(
      prisma.manualOrderLine.update({
        where: { id: order.lines[0].id },
        data: { unitPriceCents: 1 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.manualOrderLine.delete({ where: { id: order.lines[0].id } }),
    ).rejects.toThrow();
    await expect(
      prisma.orderEvent.update({
        where: { id: event.id },
        data: { reason: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.orderEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.orderOperation.update({
        where: { id: operation.id },
        data: { requestHash: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.orderStockLink.update({
        where: { id: link.id },
        data: { purpose: "return" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.orderReturn.update({
        where: { id: returned.id },
        data: { received: 99 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.manualOrder.delete({ where: { id: order.id } }),
    ).rejects.toThrow();
    for (const role of ["anon", "authenticated"]) {
      for (const table of [
        "ManualOrder",
        "ManualOrderLine",
        "OrderEvent",
        "OrderOperation",
        "OrderReturn",
        "OrderStockLink",
      ]) {
        await expect(
          prisma.$transaction(async (tx) => {
            if (role === "anon") await tx.$executeRaw`SET LOCAL ROLE anon`;
            else await tx.$executeRaw`SET LOCAL ROLE authenticated`;
            await tx.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 1`);
          }),
        ).rejects.toThrow();
      }
    }
  });
});
