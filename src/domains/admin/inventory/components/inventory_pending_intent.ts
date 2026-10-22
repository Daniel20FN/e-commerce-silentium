import { z } from "zod";
import {
  inventoryMinimumSchema,
  inventoryMutationSchema,
} from "../services/inventory_schemas";
import type {
  InventoryMinimumParams,
  InventoryMovementDto,
  InventoryMutationParams,
  InventoryVariantDto,
} from "../types/api_params";
const variant = z
  .object({
    id: z.string(),
    sku: z.string(),
    stock: z.number().int().min(0),
    revision: z.number().int().min(0),
    minimum: z.number().int().min(0).nullable(),
    inTrash: z.boolean(),
    active: z.boolean(),
  })
  .strict();
const movement = z
  .object({
    id: z.string(),
    variantId: z.string(),
    sku: z.string(),
    type: z
      .enum(["initial", "entry", "exit", "count", "reversal", "maintenance"])
      .optional(),
    delta: z.number().int(),
    before: z.number().int().min(0),
    after: z.number().int().min(0),
    actorLabel: z.string().nullable(),
    reason: z.string(),
    reference: z.string().nullable(),
    reversedById: z.string().nullable(),
    orderLinked: z.boolean().optional(),
    createdAt: z.string(),
  })
  .strict();
const pendingBatch = z
  .object({
    payload: inventoryMutationSchema,
    variants: z.array(variant).max(25),
    movements: z.array(movement).max(25),
  })
  .strict();
const pendingMinimum = z
  .object({ payload: inventoryMinimumSchema, variant })
  .strict();
const key = (productId: string, kind: "batch" | "minimum") =>
  `inventory-pending:${kind}:${productId}`;
export function readPendingBatch(productId: string) {
  try {
    const raw = sessionStorage.getItem(key(productId, "batch"));
    if (!raw) return null;
    const result = pendingBatch.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function readPendingMinimum(productId: string) {
  try {
    const raw = sessionStorage.getItem(key(productId, "minimum"));
    if (!raw) return null;
    const result = pendingMinimum.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function savePendingBatch(
  productId: string,
  payload: InventoryMutationParams,
  variants: InventoryVariantDto[],
  movements: InventoryMovementDto[],
): void {
  try {
    sessionStorage.setItem(
      key(productId, "batch"),
      JSON.stringify({ payload, variants, movements }),
    );
  } catch {
    /* In-memory intent still protects retries when browser storage is unavailable. */
  }
}
export function savePendingMinimum(
  productId: string,
  payload: InventoryMinimumParams,
  variant: InventoryVariantDto,
): void {
  try {
    sessionStorage.setItem(
      key(productId, "minimum"),
      JSON.stringify({ payload, variant }),
    );
  } catch {
    /* In-memory intent remains available. */
  }
}
export function clearPending(
  productId: string,
  kind: "batch" | "minimum",
): void {
  try {
    sessionStorage.removeItem(key(productId, kind));
  } catch {
    /* Storage can be disabled by browser policy. */
  }
}
