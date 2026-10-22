import {
  setInventoryContext,
  type InventoryActor,
} from "@/domains/admin/inventory/services/inventory_context";
import { CatalogOperationError } from "@/domains/admin/products/services/catalog_operation_error";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import "server-only";
import type {
  CreateOrderParams,
  OrderDetailDto,
  OrderDraftParams,
  OrderMutationParams,
  OrderMutationResult,
  OrdersData,
  OrdersQueryParams,
  OrderVariantQueryParams,
  OrderVariantsData,
  SaveOrderDraftParams,
} from "../types/api_params";
import {
  draftLines,
  orderVariantSelect,
  projectOrderVariant,
  sellableProductWhere,
} from "./order_catalog";
import {
  orderDetailInclude,
  orderSummarySelect,
  projectOrder,
  projectOrderSummary,
  type OrderRecord,
} from "./order_projection";
import {
  canAdvanceFulfillment,
  canCancelOrder,
  canReturnOrder,
} from "./order_rules";
import {
  createOrderSchema,
  orderMutationSchema,
  ordersQuerySchema,
  orderVariantQuerySchema,
  saveOrderDraftSchema,
} from "./order_schemas";

function fail(
  message: string,
  type:
    | "conflict"
    | "not_found"
    | "invalid_state"
    | "validation_error" = "conflict",
): never {
  throw new CatalogOperationError(type, message);
}
const fingerprint = (
  kind: string,
  orderId: string | null,
  input: object,
): string =>
  createHash("sha256")
    .update(JSON.stringify({ kind, orderId, input }))
    .digest("hex");
function assertActor(actor: InventoryActor): void {
  if (!actor.id || !actor.label) fail("unauthorized", "invalid_state");
}
async function replay(
  tx: Prisma.TransactionClient,
  operationId: string,
  orderId: string | null,
  hash: string,
  actor: InventoryActor,
): Promise<OrderMutationResult | null> {
  const op = await tx.orderOperation.findUnique({ where: { id: operationId } });
  if (!op) return null;
  if (
    (orderId && op.orderId !== orderId) ||
    op.requestHash !== hash ||
    op.actorId !== actor.id
  )
    fail("order_operation_reused");
  return { orderId: op.orderId, operationId };
}
async function catchReplay(
  error: unknown,
  operationId: string,
  orderId: string | null,
  hash: string,
  actor: InventoryActor,
): Promise<OrderMutationResult> {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2034", "P2025"].includes(error.code)
  ) {
    const result = await replay(prisma, operationId, orderId, hash, actor);
    if (result) return result;
    return fail("order_conflict");
  }
  throw error;
}
async function lockCatalog(
  tx: Prisma.TransactionClient,
  variantIds: string[],
): Promise<void> {
  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true },
    take: 25,
  });
  if (variants.length !== variantIds.length)
    fail("record_not_found", "not_found");
  for (const productId of [...new Set(variants.map((v) => v.productId))].sort())
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${productId} FOR UPDATE`;
  for (const id of [...variantIds].sort())
    await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id"=${id} FOR UPDATE`;
}
function draftHeader(input: OrderDraftParams) {
  const subtotalCents = input.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPriceCents,
    0,
  );
  return {
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    delivery: input.delivery,
    address: input.delivery === "shipping" ? (input.address ?? null) : null,
    notes: input.notes || null,
    subtotalCents,
    shippingCents: input.shippingCents,
    totalCents: subtotalCents + input.shippingCents,
  };
}
async function event(
  tx: Prisma.TransactionClient,
  orderId: string,
  operationId: string,
  actor: InventoryActor,
  kind:
    | "created"
    | "edited"
    | "confirmed"
    | "cancelled"
    | "payment"
    | "fulfillment"
    | "returned",
  reason?: string,
  from?: string,
  to?: string,
) {
  return tx.orderEvent.create({
    data: {
      orderId,
      operationId,
      kind,
      actorId: actor.id,
      actorLabel: actor.label,
      reason,
      from,
      to,
    },
  });
}
export async function createOrder(
  params: CreateOrderParams,
  actor: InventoryActor,
): Promise<OrderMutationResult> {
  assertActor(actor);
  const input = createOrderSchema.parse(params);
  const hash = fingerprint("create", null, input);
  try {
    return await prisma.$transaction(
      async (tx) => {
        const prior = await replay(tx, input.operationId, null, hash, actor);
        if (prior) return prior;
        await lockCatalog(
          tx,
          input.lines.map((l) => l.variantId),
        );
        const lines = await draftLines(tx, input.lines);
        const order = await tx.manualOrder.create({
          data: {
            id: randomUUID(),
            ...draftHeader(input),
            createdById: actor.id,
            createdByLabel: actor.label,
            lines: { create: lines },
          },
        });
        await tx.orderOperation.create({
          data: {
            id: input.operationId,
            orderId: order.id,
            actorId: actor.id,
            requestHash: hash,
          },
        });
        await event(tx, order.id, input.operationId, actor, "created");
        return { orderId: order.id, operationId: input.operationId };
      },
      { timeout: 20000 },
    );
  } catch (error) {
    return catchReplay(error, input.operationId, null, hash, actor);
  }
}
async function withOrder(
  orderId: string,
  input: { operationId: string; expectedRevision: number },
  actor: InventoryActor,
  kind: string,
  write: (tx: Prisma.TransactionClient, order: OrderRecord) => Promise<void>,
): Promise<OrderMutationResult> {
  assertActor(actor);
  const hash = fingerprint(kind, orderId, input);
  try {
    return await prisma.$transaction(
      async (tx) => {
        const prior = await replay(tx, input.operationId, orderId, hash, actor);
        if (prior) return prior;
        await tx.$queryRaw`SELECT "id" FROM "ManualOrder" WHERE "id"=${orderId} FOR UPDATE`;
        const afterLock = await replay(
          tx,
          input.operationId,
          orderId,
          hash,
          actor,
        );
        if (afterLock) return afterLock;
        const order = await tx.manualOrder.findUnique({
          where: { id: orderId },
          include: orderDetailInclude,
        });
        if (!order) return fail("record_not_found", "not_found");
        if (order.revision !== input.expectedRevision)
          return fail("order_conflict");
        if (order.events.length >= 2000)
          return fail("order_history_limit", "invalid_state");
        await tx.orderOperation.create({
          data: {
            id: input.operationId,
            orderId,
            actorId: actor.id,
            requestHash: hash,
          },
        });
        await write(tx, order);
        await tx.manualOrder.update({
          where: { id: orderId, revision: input.expectedRevision },
          data: { revision: { increment: 1 } },
        });
        return { orderId, operationId: input.operationId };
      },
      { timeout: 20000 },
    );
  } catch (error) {
    return catchReplay(error, input.operationId, orderId, hash, actor);
  }
}
export async function saveOrderDraft(
  orderId: string,
  params: SaveOrderDraftParams,
  actor: InventoryActor,
): Promise<OrderMutationResult> {
  const input = saveOrderDraftSchema.parse(params);
  return withOrder(orderId, input, actor, "edit", async (tx, order) => {
    if (order.status !== "draft")
      return fail("order_invalid_transition", "invalid_state");
    await lockCatalog(
      tx,
      input.lines.map((l) => l.variantId),
    );
    const lines = await draftLines(tx, input.lines);
    await tx.manualOrderLine.deleteMany({ where: { orderId } });
    await tx.manualOrder.update({
      where: { id: orderId },
      data: { ...draftHeader(input), lines: { create: lines } },
    });
    await event(tx, orderId, input.operationId, actor, "edited");
  });
}
function childOperationId(operationId: string, productId: string): string {
  const hash = createHash("sha256")
    .update(`${operationId}:${productId}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
async function moveStock(
  tx: Prisma.TransactionClient,
  order: OrderRecord,
  eventId: string,
  operationId: string,
  actor: InventoryActor,
  purpose: "confirmation" | "cancellation" | "return",
  rows: { line: OrderRecord["lines"][number]; delta: number }[],
  reason: string,
): Promise<void> {
  if (!rows.length) return;
  await lockCatalog(
    tx,
    rows.map((r) => r.line.variantId),
  );
  for (const productId of [
    ...new Set(rows.map((r) => r.line.productId)),
  ].sort()) {
    await tx.inventoryOperation.create({
      data: {
        id: childOperationId(operationId, productId),
        productId,
        actorId: actor.id,
        requestHash: fingerprint(purpose, order.id, { operationId, productId }),
      },
    });
  }
  for (const { line, delta } of [...rows].sort((a, b) =>
    a.line.variantId.localeCompare(b.line.variantId),
  )) {
    const v = await tx.productVariant.findUnique({
      where: { id: line.variantId },
      select: { id: true, stock: true, stockRevision: true },
    });
    if (!v) return fail("record_not_found", "not_found");
    const stock = v.stock + delta;
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 999999999)
      return fail("order_stock_insufficient", "invalid_state");
    await setInventoryContext(tx, {
      type: delta < 0 ? "exit" : "entry",
      variantId: v.id,
      actorId: actor.id,
      actorLabel: actor.label,
      reason,
      reference: `order:${order.number}`,
      operationId: childOperationId(operationId, line.productId),
    });
    const updated = await tx.productVariant.update({
      where: { id: v.id, stockRevision: v.stockRevision },
      data: { stock },
      select: { stockRevision: true },
    });
    const movement = await tx.inventoryMovement.findUnique({
      where: {
        variantId_revision: {
          variantId: v.id,
          revision: updated.stockRevision,
        },
      },
      select: { id: true },
    });
    if (!movement) return fail("order_stock_history_missing", "invalid_state");
    await tx.orderStockLink.create({
      data: {
        orderId: order.id,
        eventId,
        lineId: line.id,
        movementId: movement.id,
        purpose,
      },
    });
  }
}
export async function mutateOrder(
  orderId: string,
  params: OrderMutationParams,
  actor: InventoryActor,
): Promise<OrderMutationResult> {
  const input = orderMutationSchema.parse(params);
  return withOrder(orderId, input, actor, input.kind, async (tx, order) => {
    if (input.kind === "confirm") {
      if (order.status !== "draft")
        return fail("order_invalid_transition", "invalid_state");
      await lockCatalog(
        tx,
        order.lines.map((l) => l.variantId),
      );
      const lines = await draftLines(
        tx,
        order.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          catalogPriceCents: l.catalogPriceCents,
          priceReason: l.priceReason ?? undefined,
        })),
      );
      for (const line of lines)
        await tx.manualOrderLine.update({
          where: { orderId_variantId: { orderId, variantId: line.variantId } },
          data: line,
        });
      const e = await event(
        tx,
        orderId,
        input.operationId,
        actor,
        "confirmed",
        undefined,
        "draft",
        "confirmed",
      );
      await moveStock(
        tx,
        order,
        e.id,
        input.operationId,
        actor,
        "confirmation",
        order.lines.map((line) => ({ line, delta: -line.quantity })),
        "order_confirmation",
      );
      await tx.manualOrder.update({
        where: { id: orderId },
        data: { status: "confirmed" },
      });
    } else if (input.kind === "cancel") {
      if (!canCancelOrder(order.status, order.fulfillment))
        return fail("order_invalid_transition", "invalid_state");
      const e = await event(
        tx,
        orderId,
        input.operationId,
        actor,
        "cancelled",
        input.reason,
        order.status,
        "cancelled",
      );
      if (order.status === "confirmed")
        await moveStock(
          tx,
          order,
          e.id,
          input.operationId,
          actor,
          "cancellation",
          order.lines.map((line) => ({ line, delta: line.quantity })),
          input.reason,
        );
      await tx.manualOrder.update({
        where: { id: orderId },
        data: { status: "cancelled" },
      });
    } else if (input.kind === "payment") {
      if (
        input.payment === order.payment ||
        (order.payment === "paid" && !input.reason)
      )
        return fail("order_invalid_transition", "invalid_state");
      await event(
        tx,
        orderId,
        input.operationId,
        actor,
        "payment",
        input.reason,
        order.payment,
        input.payment,
      );
      await tx.manualOrder.update({
        where: { id: orderId },
        data: { payment: input.payment },
      });
    } else if (input.kind === "fulfillment") {
      if (
        !canAdvanceFulfillment(
          order.status,
          order.delivery,
          order.fulfillment,
          input.fulfillment,
        )
      )
        return fail("order_invalid_transition", "invalid_state");
      await event(
        tx,
        orderId,
        input.operationId,
        actor,
        "fulfillment",
        undefined,
        order.fulfillment,
        input.fulfillment,
      );
      await tx.manualOrder.update({
        where: { id: orderId },
        data: { fulfillment: input.fulfillment },
      });
    } else {
      if (!canReturnOrder(order.status, order.delivery, order.fulfillment))
        return fail("order_invalid_transition", "invalid_state");
      const rows = input.rows.map((row) => {
        const line = order.lines.find((l) => l.id === row.lineId);
        if (
          !line ||
          line.returns.reduce((s, r) => s + r.received, 0) + row.received >
            line.quantity
        )
          return fail("order_return_invalid", "validation_error");
        return { line, ...row };
      });
      const e = await event(
        tx,
        orderId,
        input.operationId,
        actor,
        "returned",
        input.reason,
      );
      for (const row of rows)
        await tx.orderReturn.create({
          data: {
            orderId,
            eventId: e.id,
            lineId: row.lineId,
            received: row.received,
            resellable: row.resellable,
          },
        });
      await moveStock(
        tx,
        order,
        e.id,
        input.operationId,
        actor,
        "return",
        rows
          .filter((r) => r.resellable > 0)
          .map((r) => ({ line: r.line, delta: r.resellable })),
        input.reason,
      );
    }
  });
}
export async function getOrder(orderId: string): Promise<OrderDetailDto> {
  const order = await prisma.manualOrder.findUnique({
    where: { id: orderId },
    include: orderDetailInclude,
  });
  if (!order) return fail("record_not_found", "not_found");
  if (order.events.length > 2000)
    return fail("order_history_limit", "invalid_state");
  return projectOrder(order);
}
export async function listOrders(
  params: OrdersQueryParams = {},
): Promise<OrdersData> {
  const query = ordersQuerySchema.parse(params);
  const cursor = query.cursor
    ? await prisma.manualOrder.findUnique({
        where: { id: query.cursor },
        select: { id: true, createdAt: true },
      })
    : null;
  if (query.cursor && !cursor) return fail("record_not_found", "not_found");
  const number =
    query.search && /^\d+$/.test(query.search) ? Number(query.search) : null;
  const orders = await prisma.manualOrder.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.payment ? { payment: query.payment } : {}),
      ...(query.fulfillment ? { fulfillment: query.fulfillment } : {}),
      AND: [
        ...(query.search
          ? [
              {
                OR: [
                  {
                    customerName: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                  { customerPhone: { contains: query.search } },
                  ...(number && number <= 2147483647 ? [{ number }] : []),
                ],
              } satisfies Prisma.ManualOrderWhereInput,
            ]
          : []),
        ...(cursor
          ? [
              {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              },
            ]
          : []),
      ],
    },
    select: orderSummarySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
  });
  return {
    orders: orders.slice(0, 30).map(projectOrderSummary),
    nextCursor: orders.length > 30 ? orders[29].id : null,
  };
}
export async function searchOrderVariants(
  params: OrderVariantQueryParams = {},
): Promise<OrderVariantsData> {
  const query = orderVariantQuerySchema.parse(params);
  return prisma.$transaction(
    async (tx) => {
      const where = await sellableProductWhere(tx);
      const variants = await tx.productVariant.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          product: where,
          ...(query.cursor ? { id: { gt: query.cursor } } : {}),
          ...(query.search
            ? {
                OR: [
                  { sku: { contains: query.search, mode: "insensitive" } },
                  {
                    product: {
                      name: { contains: query.search, mode: "insensitive" },
                    },
                  },
                ],
              }
            : {}),
        },
        select: orderVariantSelect,
        orderBy: { id: "asc" },
        take: 21,
      });
      return {
        variants: variants.slice(0, 20).map(projectOrderVariant),
        nextCursor: variants.length > 20 ? variants[19].id : null,
      };
    },
    { timeout: 10000 },
  );
}
