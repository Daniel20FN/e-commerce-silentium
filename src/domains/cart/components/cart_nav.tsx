"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { ShoppingBagOutlined } from "@mui/icons-material";
import { Badge, IconButton } from "@mui/material";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { cartReadyAtom, cartUnitsAtom } from "../states/cart_state";

export function CartNav({ dictionary }: { dictionary: Dictionary }) {
  const ready = useAtomValue(cartReadyAtom);
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
