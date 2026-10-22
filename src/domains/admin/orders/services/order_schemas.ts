import { z } from "zod";

export const MAX_ORDER_TOTAL = 2147483647;
export const MAX_ORDER_LINES = 25;
const money = z.number().int().min(0).max(999999999);
const reason = z.string().trim().min(3).max(500);
const id = z.string().trim().min(1).max(100);
const operation = {
  operationId: z.uuid(),
  expectedRevision: z.number().int().min(0),
};
const draftLine = z
  .object({
    variantId: id,
    quantity: z.number().int().min(1).max(999999999),
    unitPriceCents: money,
    catalogPriceCents: money,
    priceReason: reason.optional(),
  })
  .strict()
  .superRefine((line, ctx) => {
    if (line.unitPriceCents !== line.catalogPriceCents && !line.priceReason)
      ctx.addIssue({
        code: "custom",
        message: "order_price_reason_required",
        path: ["priceReason"],
      });
  });
const draftFields = {
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s()-]{6,24}$/),
  delivery: z.enum(["shipping", "pickup"]),
  address: z.string().trim().max(500).optional(),
  shippingCents: money,
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(draftLine).min(1).max(MAX_ORDER_LINES),
};
function refineDraft(
  input: {
    delivery: string;
    address?: string;
    shippingCents: number;
    lines: { variantId: string; quantity: number; unitPriceCents: number }[];
  },
  ctx: z.RefinementCtx,
): void {
  if (
    input.delivery === "shipping" &&
    (!input.address || input.address.length < 5)
  )
    ctx.addIssue({
      code: "custom",
      message: "order_address_required",
      path: ["address"],
    });
  if (input.delivery === "pickup" && input.address)
    ctx.addIssue({
      code: "custom",
      message: "order_pickup_address",
      path: ["address"],
    });
  if (input.delivery === "pickup" && input.shippingCents !== 0)
    ctx.addIssue({
      code: "custom",
      message: "order_pickup_shipping",
      path: ["shippingCents"],
    });
  if (new Set(input.lines.map((l) => l.variantId)).size !== input.lines.length)
    ctx.addIssue({
      code: "custom",
      message: "order_duplicate_lines",
      path: ["lines"],
    });
  const total = input.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPriceCents,
    input.shippingCents,
  );
  if (!Number.isSafeInteger(total) || total > MAX_ORDER_TOTAL)
    ctx.addIssue({
      code: "custom",
      message: "order_total_invalid",
      path: ["lines"],
    });
}
export const createOrderSchema = z
  .object({ operationId: operation.operationId, ...draftFields })
  .strict()
  .superRefine(refineDraft);
export const saveOrderDraftSchema = z
  .object({ ...operation, ...draftFields })
  .strict()
  .superRefine(refineDraft);
const returnRow = z
  .object({
    lineId: id,
    received: z.number().int().min(1).max(999999999),
    resellable: z.number().int().min(0).max(999999999),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.resellable > row.received)
      ctx.addIssue({
        code: "custom",
        message: "order_return_invalid",
        path: ["resellable"],
      });
  });
export const orderMutationSchema = z.discriminatedUnion("kind", [
  z.object({ ...operation, kind: z.literal("confirm") }).strict(),
  z.object({ ...operation, kind: z.literal("cancel"), reason }).strict(),
  z
    .object({
      ...operation,
      kind: z.literal("payment"),
      payment: z.enum(["pending", "paid"]),
      reason: reason.optional(),
    })
    .strict(),
  z
    .object({
      ...operation,
      kind: z.literal("fulfillment"),
      fulfillment: z.enum([
        "pending",
        "preparing",
        "shipped",
        "ready",
        "delivered",
      ]),
    })
    .strict(),
  z
    .object({
      ...operation,
      kind: z.literal("return"),
      reason,
      rows: z.array(returnRow).min(1).max(MAX_ORDER_LINES),
    })
    .strict()
    .superRefine((input, ctx) => {
      if (new Set(input.rows.map((r) => r.lineId)).size !== input.rows.length)
        ctx.addIssue({
          code: "custom",
          message: "order_duplicate_lines",
          path: ["rows"],
        });
    }),
]);
export const ordersQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["draft", "confirmed", "cancelled"]).optional(),
    payment: z.enum(["pending", "paid"]).optional(),
    fulfillment: z
      .enum(["pending", "preparing", "shipped", "ready", "delivered"])
      .optional(),
    cursor: id.optional(),
  })
  .strict();
export const orderVariantQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    cursor: id.optional(),
  })
  .strict();
