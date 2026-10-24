import {
  array,
  int,
  literal,
  maximum,
  maxLength,
  minimum,
  minLength,
  refine,
  regex,
  strictObject,
  string,
  unknown as unknownValue,
} from "zod/mini";
import type { CartItem, CartQuote } from "../types/api_params";
import { MAX_CART_LINES, MAX_CART_QUANTITY } from "./cart_constants";

export { CART_KEY, MAX_CART_LINES, MAX_CART_QUANTITY } from "./cart_constants";
export const cartItemSchema = strictObject({
  variantId: string().check(
    minLength(1),
    maxLength(128),
    regex(/^[a-zA-Z0-9_-]+$/),
  ),
  quantity: int().check(minimum(1), maximum(MAX_CART_QUANTITY)),
});
export const resolveCartSchema = strictObject({
  items: array(cartItemSchema).check(
    maxLength(MAX_CART_LINES),
    refine(
      (items) =>
        new Set(items.map((item) => item.variantId)).size === items.length,
    ),
  ),
});

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
    const envelope = strictObject({
      version: literal(1),
      items: array(unknownValue()).check(maxLength(500)),
    }).safeParse(parsed);
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
