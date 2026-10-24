"use client";
import { atom } from "jotai";
import type { CartItem } from "../types/api_params";

export const cartItemsAtom = atom<CartItem[]>([]);
export const cartReadyAtom = atom(false);
export const cartNoticeAtom = atom<"storage" | "recovered" | null>(null);
export const cartUnitsAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.quantity, 0),
);
