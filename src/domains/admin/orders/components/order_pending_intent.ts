"use client";
import { z } from "zod";
import {
  createOrderSchema,
  orderMutationSchema,
  saveOrderDraftSchema,
} from "../services/order_schemas";
import type {
  CreateOrderParams,
  OrderMutationParams,
  SaveOrderDraftParams,
} from "../types/api_params";
const pending = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("create"),
      actorId: z.string(),
      scope: z.uuid(),
      orderId: z.literal("new"),
      payload: createOrderSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal("save"),
      actorId: z.string(),
      scope: z.uuid(),
      orderId: z.string().min(1),
      payload: saveOrderDraftSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal("mutate"),
      actorId: z.string(),
      scope: z.uuid(),
      orderId: z.string().min(1),
      payload: orderMutationSchema,
    })
    .strict(),
]);
export type OrderPending = z.infer<typeof pending>;
function sessionScope(): string {
  const key = "orders-tab-scope";
  const value = sessionStorage.getItem(key);
  if (value && z.uuid().safeParse(value).success) return value;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}
const storageKey = (actorId: string, orderId: string) =>
  `orders-pending:${actorId}:${orderId}`;
export function readOrderPending(
  actorId: string,
  orderId: string,
): OrderPending | null {
  try {
    const raw = sessionStorage.getItem(storageKey(actorId, orderId));
    if (!raw) return null;
    const parsed = pending.safeParse(JSON.parse(raw));
    return parsed.success &&
      parsed.data.actorId === actorId &&
      parsed.data.orderId === orderId &&
      parsed.data.scope === sessionScope()
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}
export function saveOrderPending(
  actorId: string,
  orderId: string,
  intent:
    | { mode: "create"; payload: CreateOrderParams }
    | { mode: "save"; payload: SaveOrderDraftParams }
    | { mode: "mutate"; payload: OrderMutationParams },
): OrderPending {
  // In-memory intent remains available when browser policy disables storage.
  let scope: string;
  try {
    scope = sessionScope();
  } catch {
    scope = crypto.randomUUID();
  }
  const value = pending.parse({ ...intent, actorId, orderId, scope });
  try {
    sessionStorage.setItem(storageKey(actorId, orderId), JSON.stringify(value));
  } catch {
    /* Same mounted intent still protects replays. */
  }
  return value;
}
export function clearOrderPending(actorId: string, orderId: string): void {
  try {
    sessionStorage.removeItem(storageKey(actorId, orderId));
  } catch {
    /* Storage may be disabled. */
  }
}
