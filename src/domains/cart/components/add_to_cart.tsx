"use client";
import Link from "@/components/navigation_link";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { StorefrontVariant } from "@/domains/storefront/types/catalog";
import { useHydrated } from "@/hooks/use_hydrated";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { useAtomValue, useStore } from "jotai";
import { useState } from "react";
import { fetchCartQuote } from "../services/cart_client";
import {
  addCartItem,
  cartSignature,
  MAX_CART_QUANTITY,
} from "../services/cart_rules";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
  writeCartAtom,
} from "../states/cart_state";

export function AddToCart({
  variant,
  dictionary,
}: {
  variant: StorefrontVariant | null;
  dictionary: Pick<Dictionary, "cart">;
}) {
  const copy = dictionary.cart;
  const store = useStore();
  const hydrated = useHydrated();
  const initialized = useAtomValue(cartReadyAtom);
  const ready = hydrated && initialized;
  const savedNotice = useAtomValue(cartNoticeAtom);
  const notice = hydrated ? savedNotice : null;
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"added" | "invalid" | "error" | null>(
    null,
  );
  const amount = Number(quantity);
  const valid =
    !!variant &&
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= Math.min(variant.stock, MAX_CART_QUANTITY);
  async function add(): Promise<void> {
    if (!variant || busy || !ready || !valid) return;
    setBusy(true);
    setStatus(null);
    try {
      const current = store.get(cartItemsAtom);
      let next;
      try {
        next = addCartItem(current, {
          variantId: variant.id,
          quantity: amount,
        });
      } catch {
        setStatus("invalid");
        return;
      }
      const quote = await fetchCartQuote(next);
      const added = quote.lines.find((line) => line.variantId === variant.id);
      if (
        cartSignature(current) !== cartSignature(store.get(cartItemsAtom)) ||
        added?.status !== "available"
      ) {
        setStatus("invalid");
        return;
      }
      store.set(writeCartAtom, next);
      setStatus("added");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label={copy.quantity}
          type="number"
          value={quantity}
          disabled={!variant || variant.stock === 0 || busy}
          onChange={(event) => {
            setQuantity(event.target.value);
            setStatus(null);
          }}
          slotProps={{
            htmlInput: {
              min: 1,
              max: Math.min(variant?.stock ?? 0, MAX_CART_QUANTITY),
              step: 1,
            },
          }}
          sx={{ width: { xs: "100%", sm: 120 } }}
        />
        <Button
          variant="contained"
          disabled={!ready || !valid || busy}
          onClick={() => void add()}
        >
          {busy ? copy.checking : copy.add}
        </Button>
      </Stack>
      {!valid ? <Alert severity="info">{copy.chooseAvailable}</Alert> : null}
      {status ? (
        <Alert
          severity={status === "added" ? "success" : "warning"}
          role="status"
        >
          {status === "added"
            ? copy.added
            : status === "invalid"
              ? copy.quantityError
              : copy.error}
          {status === "added" ? (
            <Button component={Link} href="/carrito" size="small">
              {copy.view}
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {notice ? (
        <Alert severity="warning">
          {notice === "storage" ? copy.storageWarning : copy.recoveredWarning}
        </Alert>
      ) : null}
    </Stack>
  );
}
