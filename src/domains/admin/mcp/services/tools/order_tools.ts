import {
  createOrderSchema,
  orderMutationSchema,
  orderVariantQuerySchema,
  ordersQuerySchema,
  saveOrderDraftSchema,
} from "@/domains/admin/orders/services/order_schemas";
import {
  createOrder,
  getOrder,
  listOrders,
  mutateOrder,
  saveOrderDraft,
  searchOrderVariants,
} from "@/domains/admin/orders/services/order_service";
import { z } from "zod";
import { defineReadTool, defineWriteTool } from "../mcp_tool_types";

const orderId = z.string().trim().min(1).max(100);
const operation = {
  operationId: z.uuid(),
  expectedRevision: z.number().int().min(0),
};
const reason = z.string().trim().min(3).max(500);

const advanceInput = z
  .object({ orderId, mutation: orderMutationSchema })
  .refine(
    (value) =>
      value.mutation.kind === "confirm" ||
      value.mutation.kind === "payment" ||
      value.mutation.kind === "fulfillment",
    { message: "order_kind_not_allowed", path: ["mutation", "kind"] },
  );

export const orderTools = [
  defineReadTool({
    name: "orders_list",
    group: "orders",
    title: "List orders",
    description:
      "Lists manual orders with filters (search, status, payment, fulfillment) and cursor pagination.",
    inputSchema: ordersQuerySchema,
    handler: (input) => listOrders(input),
  }),
  defineReadTool({
    name: "orders_get",
    group: "orders",
    title: "Get order",
    description:
      "Returns one order with lines, customer data, history and its revision.",
    inputSchema: z.object({ orderId }),
    handler: (input) => getOrder(input.orderId),
  }),
  defineReadTool({
    name: "orders_search_variants",
    group: "orders",
    title: "Search sellable variants",
    description:
      "Searches variants that can be added to an order, with current price and available stock.",
    inputSchema: orderVariantQuerySchema,
    handler: (input) => searchOrderVariants(input),
  }),
  defineWriteTool({
    name: "orders_create_draft",
    group: "orders",
    title: "Create order draft",
    description:
      "Creates a draft manual order. Prices are in cents; operationId (uuid) makes the call idempotent. A draft does not deduct stock.",
    destructive: false,
    inputSchema: z.object({ order: createOrderSchema }),
    handler: (input, { actor }) => createOrder(input.order, actor),
  }),
  defineWriteTool({
    name: "orders_save_draft",
    group: "orders",
    title: "Save order draft",
    description:
      "Replaces the content of a draft order. Requires its operationId (new uuid) and expectedRevision from orders_get.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ orderId, draft: saveOrderDraftSchema }),
    handler: (input, { actor }) =>
      saveOrderDraft(input.orderId, input.draft, actor),
  }),
  defineWriteTool({
    name: "orders_advance",
    group: "orders",
    title: "Confirm or advance order",
    description:
      "Moves an order forward: mutation.kind is confirm (deducts the stock of every line atomically), payment or fulfillment. Transitions only go forward and cannot be undone. Requires operationId (uuid) and expectedRevision. Use orders_cancel or orders_register_return for the other transitions.",
    destructive: true,
    inputSchema: advanceInput,
    handler: (input, { actor }) =>
      mutateOrder(input.orderId, input.mutation, actor),
  }),
  defineWriteTool({
    name: "orders_cancel",
    group: "orders",
    title: "Cancel order",
    description:
      "Cancels an order with a reason (min 3 characters), putting back the units that were deducted. Irreversible.",
    destructive: true,
    inputSchema: z.object({ orderId, ...operation, reason }),
    handler: (input, { actor }) =>
      mutateOrder(
        input.orderId,
        orderMutationSchema.parse({
          kind: "cancel",
          operationId: input.operationId,
          expectedRevision: input.expectedRevision,
          reason: input.reason,
        }),
        actor,
      ),
  }),
  defineWriteTool({
    name: "orders_register_return",
    group: "orders",
    title: "Register order return",
    description:
      "Registers a return: per line, units received and how many are resellable (they go back to stock). Irreversible.",
    destructive: true,
    inputSchema: z.object({
      orderId,
      ...operation,
      reason,
      rows: z
        .array(
          z.object({
            lineId: z.string().trim().min(1).max(100),
            received: z.number().int().min(1),
            resellable: z.number().int().min(0),
          }),
        )
        .min(1)
        .max(25),
    }),
    handler: (input, { actor }) =>
      mutateOrder(
        input.orderId,
        orderMutationSchema.parse({
          kind: "return",
          operationId: input.operationId,
          expectedRevision: input.expectedRevision,
          reason: input.reason,
          rows: input.rows,
        }),
        actor,
      ),
  }),
];
