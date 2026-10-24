"use client";
import { useStore } from "jotai";
import { useEffect } from "react";
import { CART_KEY } from "../services/cart_constants";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
} from "../states/cart_atoms";

export function CartBootstrap() {
  const store = useStore();
  useEffect(() => {
    let active = true;
    let revision = 0;
    const restore = async (raw: string | null): Promise<void> => {
      const current = ++revision;
      try {
        // An empty browser needs no parser; persisted input stays untrusted.
        const saved =
          raw === null
            ? { items: [], recovered: false }
            : (await import("../services/cart_rules")).readCart(raw);
        if (!active || current !== revision) return;
        store.set(cartItemsAtom, saved.items);
        if (saved.recovered) store.set(cartNoticeAtom, "recovered");
      } catch {
        if (active && current === revision)
          store.set(cartNoticeAtom, "storage");
      } finally {
        if (active && current === revision) store.set(cartReadyAtom, true);
      }
    };
    if (!store.get(cartReadyAtom)) {
      try {
        void restore(localStorage.getItem(CART_KEY));
      } catch {
        store.set(cartNoticeAtom, "storage");
        store.set(cartReadyAtom, true);
      }
    }
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea !== localStorage ||
        (event.key !== CART_KEY && event.key !== null)
      )
        return;
      void restore(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
    };
  }, [store]);
  return null;
}
