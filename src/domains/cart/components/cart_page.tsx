"use client";
import Link from "@/components/navigation_link";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { useHydrated } from "@/hooks/use_hydrated";
import { priceFormatter } from "@/utils/price_formatter";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAtomValue, useStore } from "jotai";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCartQuote } from "../services/cart_client";
import { cartSignature, pricesChanged } from "../services/cart_rules";
import { buildWhatsAppSummary } from "../services/whatsapp";
import {
  cartItemsAtom,
  cartNoticeAtom,
  cartReadyAtom,
  writeCartAtom,
} from "../states/cart_state";
import type { CartContact, CartLine, CartQuote } from "../types/api_params";

type QuoteState = {
  signature: string;
  quote: CartQuote | null;
  error: boolean;
  changed: boolean;
};
const money = (cents: number) => `${priceFormatter(cents / 100)} COP`;

function LineQuantity({
  line,
  copy,
  onChange,
  onDraft,
  pending,
}: {
  line: CartLine;
  copy: Dictionary["cart"];
  onChange: (quantity: number) => void;
  onDraft: (value: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(String(line.quantity));
  const valid =
    /^\d+$/.test(value) &&
    Number(value) >= 1 &&
    Number(value) <= line.maxQuantity;
  return (
    <TextField
      type="number"
      label={copy.quantity}
      value={value}
      disabled={pending || line.maxQuantity === 0}
      onChange={(event) => {
        setValue(event.target.value);
        onDraft(event.target.value);
      }}
      onBlur={() => {
        if (valid && Number(value) !== line.quantity) onChange(Number(value));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && valid) onChange(Number(value));
      }}
      error={!valid && line.maxQuantity > 0}
      helperText={
        !valid && line.maxQuantity > 0
          ? copy.quantityRange.replace("{count}", String(line.maxQuantity))
          : undefined
      }
      slotProps={{
        htmlInput: {
          min: 1,
          max: line.maxQuantity,
          step: 1,
          "aria-label": `${copy.quantity}: ${line.name ?? copy.unavailable}`,
        },
      }}
      sx={{ width: { xs: "100%", sm: 190 } }}
    />
  );
}

export function CartPage({
  dictionary,
  contact,
}: {
  dictionary: Pick<Dictionary, "cart">;
  contact: CartContact;
}) {
  const copy = dictionary.cart;
  const store = useStore();
  const items = useAtomValue(cartItemsAtom);
  const hydrated = useHydrated();
  const initialized = useAtomValue(cartReadyAtom);
  const ready = hydrated && initialized;
  const savedNotice = useAtomValue(cartNoticeAtom);
  const notice = hydrated ? savedNotice : null;
  const signature = cartSignature(items);
  const sequence = useRef(0);
  const [state, setState] = useState<QuoteState>({
    signature: "",
    quote: null,
    error: false,
    changed: false,
  });
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const hasDrafts = items.some(
    (item) =>
      drafts[`${item.variantId}:${item.quantity}`] !== undefined &&
      drafts[`${item.variantId}:${item.quantity}`] !== String(item.quantity),
  );
  const [review, setReview] = useState<{
    signature: string;
    quoteSignature: string;
    summary: ReturnType<typeof buildWhatsAppSummary>;
  } | null>(null);
  const [copyState, setCopyState] = useState<"copied" | "copyFailed" | null>(
    null,
  );
  const current = ready && state.signature === signature;
  const quote = current ? state.quote : null;

  const refresh = useCallback(
    (signal?: AbortSignal): Promise<CartQuote | null> => {
      const request = ++sequence.current;
      const snapshot = store.get(cartItemsAtom);
      const key = cartSignature(snapshot);
      return fetchCartQuote(snapshot, signal)
        .then((result) => {
          if (
            signal?.aborted ||
            request !== sequence.current ||
            cartSignature(store.get(cartItemsAtom)) !== key
          )
            return null;
          setState((previous) => ({
            signature: key,
            quote: result,
            error: false,
            changed: previous.changed || pricesChanged(previous.quote, result),
          }));
          return result;
        })
        .catch(() => {
          if (
            !signal?.aborted &&
            request === sequence.current &&
            cartSignature(store.get(cartItemsAtom)) === key
          )
            setState({
              signature: key,
              quote: null,
              error: true,
              changed: false,
            });
          return null;
        });
    },
    [store],
  );
  useEffect(() => {
    if (!ready || !items.length) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const focus = () => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal);
    };
    document.addEventListener("visibilitychange", focus);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", focus);
    };
  }, [signature, ready, items.length, refresh]);

  function write(next: typeof items): void {
    store.set(writeCartAtom, next);
    setReview(null);
  }
  async function prepare(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setCopyState(null);
    const snapshot = cartSignature(store.get(cartItemsAtom));
    const fresh = await refresh();
    if (fresh?.valid && cartSignature(store.get(cartItemsAtom)) === snapshot) {
      setReview({
        signature: snapshot,
        quoteSignature: JSON.stringify(fresh),
        summary: buildWhatsAppSummary(fresh, contact, copy),
      });
    }
    setBusy(false);
  }
  async function copyMessage(): Promise<void> {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.summary.message);
      setCopyState("copied");
    } catch {
      setCopyState("copyFailed");
    }
  }
  const expired =
    review !== null &&
    (review.signature !== signature ||
      (quote !== null && review.quoteSignature !== JSON.stringify(quote)) ||
      (current && state.error));
  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        <Typography
          component="h1"
          variant="h3"
          sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}
        >
          {copy.title}
        </Typography>
        {notice ? (
          <Alert severity="warning">
            {notice === "storage" ? copy.storageWarning : copy.recoveredWarning}
          </Alert>
        ) : null}
        {!ready ? (
          <CircularProgress aria-label={copy.checking} />
        ) : !items.length ? (
          <Paper variant="outlined" sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h6">{copy.empty}</Typography>
              <Button component={Link} href="/productos">
                {copy.explore}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <>
            {state.changed ? (
              <Alert severity="warning">{copy.priceChanged}</Alert>
            ) : null}
            {current && state.error ? (
              <Alert
                severity="error"
                action={
                  <Button onClick={() => void refresh()}>{copy.retry}</Button>
                }
              >
                {copy.error}
              </Alert>
            ) : null}
            {!current ? (
              <Stack direction="row" spacing={2}>
                <CircularProgress size={22} />
                <Typography>{copy.checking}</Typography>
              </Stack>
            ) : null}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0,1fr)",
                  md: "minmax(0,1fr) 330px",
                },
                gap: 3,
                alignItems: "start",
              }}
            >
              <Stack spacing={2} sx={{ minWidth: 0 }}>
                {items.map((item) => {
                  const line = (
                    quote ?? (!current ? state.quote : null)
                  )?.lines.find((entry) => entry.variantId === item.variantId);
                  return (
                    <Paper
                      key={item.variantId}
                      variant="outlined"
                      sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}
                    >
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 90,
                              height: 90,
                              position: "relative",
                              bgcolor: "action.hover",
                              borderRadius: 2,
                              flexShrink: 0,
                              overflow: "hidden",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {line?.image ? (
                              <Image
                                src={line.image.url}
                                alt={line.image.alt}
                                fill
                                sizes="90px"
                                style={{ objectFit: "contain" }}
                              />
                            ) : (
                              <Typography variant="caption" align="center">
                                {copy.noImage}
                              </Typography>
                            )}
                          </Box>
                          <Stack
                            spacing={0.5}
                            sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                          >
                            <Typography component="h2" variant="h6">
                              {line?.name ??
                                (quote
                                  ? copy.unavailable
                                  : copy.pendingProduct)}
                            </Typography>
                            {line?.attributes ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {line.attributes}
                              </Typography>
                            ) : null}
                            <Typography variant="caption">
                              {copy.sku}: {line?.sku ?? item.variantId}
                            </Typography>
                            {quote && line?.priceCents != null ? (
                              <Typography>{money(line.priceCents)}</Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                        {quote && line?.status === "unavailable" ? (
                          <Alert severity="warning">{copy.unavailable}</Alert>
                        ) : quote && line?.status === "insufficient_stock" ? (
                          <Alert severity="warning">
                            {copy.stockReduced.replace(
                              "{count}",
                              String(line.maxQuantity),
                            )}
                          </Alert>
                        ) : null}
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          sx={{ alignItems: { sm: "center" } }}
                        >
                          {line ? (
                            <LineQuantity
                              key={`${item.variantId}:${item.quantity}:${line.maxQuantity}`}
                              line={{ ...line, quantity: item.quantity }}
                              pending={!current}
                              copy={copy}
                              onDraft={(value) =>
                                setDrafts((previous) => ({
                                  ...previous,
                                  [`${item.variantId}:${item.quantity}`]: value,
                                }))
                              }
                              onChange={(quantity) =>
                                write(
                                  store
                                    .get(cartItemsAtom)
                                    .map((entry) =>
                                      entry.variantId === item.variantId
                                        ? { ...entry, quantity }
                                        : entry,
                                    ),
                                )
                              }
                            />
                          ) : (
                            <Typography>
                              {copy.quantity}: {item.quantity}
                            </Typography>
                          )}
                          {quote && line?.subtotalCents != null ? (
                            <Typography sx={{ flex: 1 }}>
                              {copy.lineSubtotal}: {money(line.subtotalCents)}
                            </Typography>
                          ) : null}
                          <Button
                            onClick={() =>
                              write(
                                store
                                  .get(cartItemsAtom)
                                  .filter(
                                    (entry) =>
                                      entry.variantId !== item.variantId,
                                  ),
                              )
                            }
                          >
                            {copy.remove}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
                <Button
                  onClick={() => setClear(true)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {copy.clear}
                </Button>
              </Stack>
              <Paper
                variant="outlined"
                sx={{ p: 3, position: { md: "sticky" }, top: { md: 100 } }}
              >
                <Stack spacing={2}>
                  <Typography component="h2" variant="h6">
                    {quote && !quote.valid
                      ? copy.partialSubtotal
                      : copy.subtotal}
                  </Typography>
                  <Typography variant="h5">
                    {quote ? money(quote.subtotalCents) : "—"}
                  </Typography>
                  {quote && !quote.valid ? (
                    <Alert severity="warning">{copy.invalidLines}</Alert>
                  ) : null}
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    {copy.disclaimer}
                  </Typography>
                  <Button
                    variant="contained"
                    disabled={!quote?.valid || busy || hasDrafts}
                    onClick={() => void prepare()}
                  >
                    {busy ? copy.checking : copy.buy}
                  </Button>
                  <Button onClick={() => void refresh()} disabled={busy}>
                    {copy.retry}
                  </Button>
                </Stack>
              </Paper>
            </Box>
          </>
        )}
      </Stack>
      <Dialog open={clear} onClose={() => setClear(false)}>
        <DialogTitle>{copy.clearTitle}</DialogTitle>
        <DialogContent>{copy.clearBody}</DialogContent>
        <DialogActions>
          <Button onClick={() => setClear(false)}>{copy.cancel}</Button>
          <Button
            onClick={() => {
              write([]);
              setClear(false);
            }}
          >
            {copy.clear}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={review !== null}
        onClose={() => setReview(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{copy.reviewTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>{copy.reviewHelp}</Typography>
            <Typography variant="body2">
              {copy.legalNotice}{" "}
              <Link
                href="/legal/terminos"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.termsLink}
              </Link>
              {" · "}
              <Link
                href="/legal/privacidad"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.privacyLink}
              </Link>
            </Typography>
            {expired ? (
              <Alert severity="warning">{copy.reviewExpired}</Alert>
            ) : null}
            {state.changed ? (
              <Alert severity="warning">{copy.priceChanged}</Alert>
            ) : null}
            {review?.summary.needsCopy ? (
              <Alert severity="warning">{copy.longMessage}</Alert>
            ) : null}
            {review?.summary.missingOrigin ? (
              <Alert severity="info">{copy.missingOrigin}</Alert>
            ) : null}
            <TextField
              label={copy.messageLabel}
              multiline
              minRows={8}
              maxRows={16}
              value={review?.summary.message ?? ""}
              slotProps={{ input: { readOnly: true } }}
            />
            {copyState ? (
              <Alert severity={copyState === "copied" ? "success" : "warning"}>
                {copy[copyState]}
              </Alert>
            ) : null}
            <Button onClick={() => void copyMessage()} disabled={expired}>
              {copy.copy}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, p: 2 }}>
          <Button onClick={() => setReview(null)}>{copy.close}</Button>
          <Button
            component="a"
            href={expired ? undefined : review?.summary.href}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            disabled={expired}
          >
            {copy.openWhatsApp}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
