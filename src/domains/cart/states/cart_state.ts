"use client";
import { atom } from "jotai";
import { CART_KEY, resolveCartSchema } from "../services/cart_rules";
import type { CartItem } from "../types/api_params";

export const cartItemsAtom = atom<CartItem[]>([]);
export const cartReadyAtom = atom(false);
export const cartNoticeAtom = atom<"storage" | "recovered" | null>(null);
export const cartUnitsAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.quantity, 0),
);
export const writeCartAtom = atom(null, (_get, set, items: CartItem[]) => {
  const valid = resolveCartSchema.parse({ items }).items;
  set(cartItemsAtom, valid);
  try {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({ version: 1, items: valid }),
    );
  } catch {
    set(cartNoticeAtom, "storage");
  }
});
