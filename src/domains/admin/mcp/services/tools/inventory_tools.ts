import {
  inventoryMinimumSchema,
  inventoryMutationSchema,
  inventoryQuerySchema,
} from "@/domains/admin/inventory/services/inventory_schemas";
import {
  getInventory,
  mutateInventory,
  setInventoryMinimum,
} from "@/domains/admin/inventory/services/inventory_service";
import { adminProductLifecycleSchema } from "@/domains/admin/products/services/admin_product_schemas";
import { z } from "zod";
import { defineReadTool, defineWriteTool } from "../mcp_tool_types";

const productId = adminProductLifecycleSchema.shape.productId;

const addStockInput = z
  .object({ productId, mutation: inventoryMutationSchema })
  .refine((value) => value.mutation.kind === "entry", {
    message: "inventory_kind_not_allowed",
    path: ["mutation", "kind"],
  });
const adjustStockInput = z
  .object({ productId, mutation: inventoryMutationSchema })
  .refine((value) => value.mutation.kind !== "entry", {
    message: "inventory_kind_not_allowed",
    path: ["mutation", "kind"],
  });

export const inventoryTools = [
  defineReadTool({
    name: "inventory_get",
    group: "inventory",
    title: "Get inventory",
    description:
      "Returns per-variant stock, revisions and minimums of a product plus its immutable movement ledger, optionally filtered (variantId, type, from/to ISO dates, reference, cursor).",
    inputSchema: z.object({
      productId,
      query: inventoryQuerySchema.optional(),
    }),
    handler: (input) => getInventory(input.productId, input.query ?? {}),
  }),
  defineWriteTool({
    name: "inventory_add_stock",
    group: "inventory",
    title: "Add stock",
    description:
      "Registers stock entries (mutation.kind must be entry). operationId (uuid) makes the call idempotent; each row needs the variant expectedRevision from inventory_get and a reason. Recorded in the immutable ledger under the authenticated user.",
    destructive: false,
    inputSchema: addStockInput,
    handler: (input, { actor }) =>
      mutateInventory(input.productId, input.mutation, actor),
  }),
  defineWriteTool({
    name: "inventory_adjust_stock",
    group: "inventory",
    title: "Reduce or adjust stock",
    description:
      "Registers stock exits, counts or reversals (mutation.kind exit, count or reversal), which can lower stock. operationId (uuid) makes the call idempotent; each row needs expectedRevision and a reason. Recorded in the immutable ledger under the authenticated user.",
    destructive: true,
    inputSchema: adjustStockInput,
    handler: (input, { actor }) =>
      mutateInventory(input.productId, input.mutation, actor),
  }),
  defineWriteTool({
    name: "inventory_set_minimum",
    group: "inventory",
    title: "Set minimum stock",
    description:
      "Sets or clears (null) the low-stock minimum of a variant. Requires operationId (uuid) and the variant expectedRevision.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, minimum: inventoryMinimumSchema }),
    handler: (input, { actor }) =>
      setInventoryMinimum(input.productId, input.minimum, actor),
  }),
];
