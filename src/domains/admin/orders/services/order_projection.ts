import type { Prisma } from "@prisma/client";
import type { OrderDetailDto, OrderSummaryDto } from "../types/api_params";

export const orderSummarySelect = {
  id: true,
  number: true,
  revision: true,
  status: true,
  payment: true,
  delivery: true,
  fulfillment: true,
  customerName: true,
  customerPhone: true,
  subtotalCents: true,
  shippingCents: true,
  totalCents: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ManualOrderSelect;
export const orderDetailInclude = {
  lines: { orderBy: { id: "asc" }, include: { returns: true } },
  events: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 2001,
    include: { returns: true },
  },
} satisfies Prisma.ManualOrderInclude;
export type OrderRecord = Prisma.ManualOrderGetPayload<{
  include: typeof orderDetailInclude;
}>;
export function projectOrderSummary(
  order: Prisma.ManualOrderGetPayload<{ select: typeof orderSummarySelect }>,
): OrderSummaryDto {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
export function projectOrder(order: OrderRecord): OrderDetailDto {
  return {
    ...projectOrderSummary({
      id: order.id,
      number: order.number,
      revision: order.revision,
      status: order.status,
      payment: order.payment,
      delivery: order.delivery,
      fulfillment: order.fulfillment,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }),
    address: order.address,
    notes: order.notes,
    createdByLabel: order.createdByLabel,
    lines: order.lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      productId: l.productId,
      productName: l.productName,
      sku: l.sku,
      attributes: l.attributes,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      catalogPriceCents: l.catalogPriceCents,
      priceReason: l.priceReason,
      received: l.returns.reduce((s, r) => s + r.received, 0),
      resellable: l.returns.reduce((s, r) => s + r.resellable, 0),
    })),
    events: order.events.map((e) => ({
      id: e.id,
      kind: e.kind,
      actorLabel: e.actorLabel,
      reason: e.reason,
      from: e.from,
      to: e.to,
      createdAt: e.createdAt.toISOString(),
      returns: e.returns.map((r) => ({
        lineId: r.lineId,
        received: r.received,
        resellable: r.resellable,
      })),
    })),
  };
}
