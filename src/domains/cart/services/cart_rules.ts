import { z } from "zod";
import type { CartItem, CartQuote } from "../types/api_params";

export const CART_KEY = "silentium.cart.v1";
export const MAX_CART_LINES = 50;
export const MAX_CART_QUANTITY = 99;
export const cartItemSchema = z
  .object({
    variantId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9_-]+$/),
    quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
  })
  .strict();
export const resolveCartSchema = z
  .object({
    items: z
      .array(cartItemSchema)
      .max(MAX_CART_LINES)
      .refine(
        (items) =>
          new Set(items.map((item) => item.variantId)).size === items.length,
      ),
  })
  .strict();

export function cartSignature(items: CartItem[]): string {
  return JSON.stringify(items);
}

export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  cartItemSchema.parse(item);
  const current = items.find((line) => line.variantId === item.variantId);
  const next = current
    ? items.map((line) =>
        line.variantId === item.variantId
          ? { ...line, quantity: line.quantity + item.quantity }
          : line,
      )
    : [...items, item];
  return resolveCartSchema.parse({ items: next }).items;
}

export function readCart(raw: string | null): {
  items: CartItem[];
  recovered: boolean;
} {
  if (raw === null) return { items: [], recovered: false };
  if (raw.length > 20000) return { items: [], recovered: true };
  try {
    // JSON/localStorage is an untrusted boundary; validate before reading fields.
    const parsed: unknown = JSON.parse(raw);
    const envelope = z
      .object({ version: z.literal(1), items: z.array(z.unknown()).max(500) })
      .strict()
      .safeParse(parsed);
    if (!envelope.success) return { items: [], recovered: true };
    const items: CartItem[] = [];
    let recovered = false;
    for (const candidate of envelope.data.items) {
      const item = cartItemSchema.safeParse(candidate);
      if (
        !item.success ||
        items.some((line) => line.variantId === item.data.variantId) ||
        items.length >= MAX_CART_LINES
      ) {
        recovered = true;
        continue;
      }
      items.push(item.data);
    }
    return { items, recovered };
  } catch {
    return { items: [], recovered: true };
  }
}

export function pricesChanged(
  previous: CartQuote | null,
  next: CartQuote,
): boolean {
  return (
    previous !== null &&
    next.lines.some((line) => {
      const old = previous.lines.find(
        (item) => item.variantId === line.variantId,
      );
      return (
        old?.priceCents != null &&
        line.priceCents != null &&
        old.priceCents !== line.priceCents
      );
    })
  );
}
