"use client";
import { useStore } from "jotai";
import { useEffect } from "react";
import { CART_KEY, readCart } from "../services/cart_rules";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
} from "../states/cart_state";

export function CartBootstrap() {
  const store = useStore();
  useEffect(() => {
    if (!store.get(cartReadyAtom)) {
      try {
        const saved = readCart(localStorage.getItem(CART_KEY));
        store.set(cartItemsAtom, saved.items);
        if (saved.recovered) store.set(cartNoticeAtom, "recovered");
      } catch {
        store.set(cartNoticeAtom, "storage");
      }
      store.set(cartReadyAtom, true);
    }
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea !== localStorage ||
        (event.key !== CART_KEY && event.key !== null)
      )
        return;
      const saved = readCart(event.newValue);
      store.set(cartItemsAtom, saved.items);
      if (saved.recovered) store.set(cartNoticeAtom, "recovered");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [store]);
  return null;
}
