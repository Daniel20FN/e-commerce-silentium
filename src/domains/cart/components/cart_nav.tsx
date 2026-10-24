"use client";
import Link from "@/components/navigation_link";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { useHydrated } from "@/hooks/use_hydrated";
import { ShoppingBagOutlined } from "@mui/icons-material";
import { Badge, IconButton } from "@mui/material";
import { useAtomValue } from "jotai";
import { cartReadyAtom, cartUnitsAtom } from "../states/cart_atoms";

export function CartNav({
  dictionary,
}: {
  dictionary: { cart: Pick<Dictionary["cart"], "title" | "navCount"> };
}) {
  const hydrated = useHydrated();
  const initialized = useAtomValue(cartReadyAtom);
  const ready = hydrated && initialized;
  const units = useAtomValue(cartUnitsAtom);
  return (
    <IconButton
      component={Link}
      href="/carrito"
      aria-label={
        ready
          ? dictionary.cart.navCount.replace("{count}", String(units))
          : dictionary.cart.title
      }
      color="inherit"
    >
      <Badge badgeContent={ready ? units : 0} max={999} color="primary">
        <ShoppingBagOutlined />
      </Badge>
    </IconButton>
  );
}
