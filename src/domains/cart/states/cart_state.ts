"use client";
import { atom } from "jotai";
import { CART_KEY, resolveCartSchema } from "../services/cart_rules";
import type { CartItem } from "../types/api_params";
import { cartItemsAtom, cartNoticeAtom } from "./cart_atoms";

export {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
  cartUnitsAtom,
} from "./cart_atoms";
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
