"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import { apiService } from "@/types/api-service/api_service";
import { priceFormatter } from "@/utils/price_formatter";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import {
  parsePricePesos,
  PRICE_BATCH_LIMIT,
  pricePesosInput,
} from "../services/catalog_operation_schemas";
import type {
  AdminPriceBatchApiResponse,
  AdminPriceBatchParams,
  AdminPriceBatchRow,
  AdminProductDetailApiResponse,
  AdminProductVariantsListApiResponse,
} from "../types/api_params";
import type { AdminProductVariantDto } from "../types/product_dto";

interface PriceDraft {
  price?: string;
  compare?: string;
}
const money = (cents: number) => priceFormatter(cents / 100);

export function PriceBatchEditor({
  dictionary,
  productId,
  revision,
  variants,
  onStateChange,
  onSaved,
}: {
  dictionary: Dictionary;
  productId: string;
  revision: string;
  variants: AdminProductVariantDto[];
  onStateChange: (state: AdminEditorState) => void;
  onSaved: () => void;
}) {
  const copy = dictionary.admin.products.operations;
  const [baseline, setBaseline] = useState(
    variants.filter((item) => !item.inTrash),
  );
  const [productRevision, setProductRevision] = useState(revision);
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({});
  const [busy, setBusy] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rebased, setRebased] = useState(false);
  const inFlight = useRef(false);
  const errorFocus = useRef<HTMLDivElement>(null);
  const values = (row: AdminProductVariantDto) => ({
    price: drafts[row.id]?.price ?? pricePesosInput(row.priceCents),
    compare:
      drafts[row.id]?.compare ??
      (row.compareAtPriceCents === null
        ? ""
        : pricePesosInput(row.compareAtPriceCents)),
  });
  const changed = baseline.filter((row) => {
    const draft = drafts[row.id];
    if (!draft) return false;
    const texts = values(row);
    return (
      row.inTrash ||
      parsePricePesos(texts.price) !== row.priceCents ||
      (texts.compare.trim() === "" ? null : parsePricePesos(texts.compare)) !==
        row.compareAtPriceCents ||
      (texts.compare.trim() !== "" && parsePricePesos(texts.compare) === null)
    );
  });
  const dirty = changed.length > 0;
  useEffect(() => onStateChange({ dirty, busy }), [dirty, busy, onStateChange]);
  useEffect(() => {
    if (error) errorFocus.current?.focus();
  }, [error]);
  const parsed = changed.map((row) => {
    const text = values(row),
      price = parsePricePesos(text.price),
      compare =
        text.compare.trim() === "" ? null : parsePricePesos(text.compare);
    return {
      row,
      text,
      price,
      compare,
      priceError: price === null,
      compareError:
        (text.compare.trim() !== "" && compare === null) ||
        (price !== null && compare !== null && compare <= price),
    };
  });
  const valid =
    parsed.length > 0 &&
    parsed.length <= PRICE_BATCH_LIMIT &&
    parsed.every(
      (item) => !item.row.inTrash && !item.priceError && !item.compareError,
    );
  const payloadRows: AdminPriceBatchRow[] = parsed.flatMap((item) =>
    item.price === null
      ? []
      : [
          {
            variantId: item.row.id,
            expectedUpdatedAt: item.row.updatedAt,
            priceCents: item.price,
            compareAtPriceCents: item.compare,
          },
        ],
  );
  const save = async () => {
    if (inFlight.current || !valid || readOnly) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setConfirm(false);
    setRebased(false);
    try {
      const data = await apiService.patch<
        AdminPriceBatchApiResponse,
        AdminPriceBatchParams
      >(`/admin/products/${productId}/prices`, {
        expectedProductUpdatedAt: productRevision,
        rows: payloadRows,
      });
      if (!data) throw new Error("empty_response");
      setDrafts({});
      onStateChange({ dirty: false, busy: false });
      onSaved();
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "";
      setError(
        [
          "variant_revision_conflict",
          "product_revision_conflict",
          "operation_retry",
        ].includes(code)
          ? copy.conflict
          : code === "product_read_only"
            ? copy.readonly
            : copy.error,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const [detail, list] = await Promise.all([
        apiService.get<AdminProductDetailApiResponse, undefined>(
          `/admin/products/${productId}`,
        ),
        apiService.get<AdminProductVariantsListApiResponse, undefined>(
          `/admin/products/${productId}/variants`,
        ),
      ]);
      if (!detail || !list) throw new Error("empty_response");
      setReadOnly(
        detail.product.inTrash ||
          detail.product.status === "archived" ||
          !!detail.product.archivedAt,
      );
      setProductRevision(detail.product.updatedAt);
      setBaseline((current) => {
        const fresh = new Map(list.items.map((row) => [row.id, row]));
        return [
          ...current.map(
            (row) => fresh.get(row.id) ?? { ...row, inTrash: true },
          ),
          ...list.items.filter(
            (row) => !current.some((old) => old.id === row.id),
          ),
        ];
      });
      setRebased(true);
    } catch {
      setError(copy.error);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const remove = (id: string) =>
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        {copy.batchTitle}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {copy.batchHelp}
      </Typography>
      {error && (
        <Alert severity="error" ref={errorFocus} tabIndex={-1}>
          {error}
        </Alert>
      )}
      {readOnly && <Alert severity="warning">{copy.readonly}</Alert>}
      {rebased && <Alert severity="info">{copy.rebased}</Alert>}
      {changed.length > PRICE_BATCH_LIMIT && (
        <Alert severity="error">{copy.tooMany}</Alert>
      )}
      {baseline.length === 0 && <Alert severity="info">{copy.noRows}</Alert>}
      {baseline
        .filter((row) => !row.inTrash || drafts[row.id])
        .map((row) => {
          const text = values(row),
            validation = parsed.find((item) => item.row.id === row.id);
          return (
            <Stack
              key={row.id}
              spacing={1.5}
              sx={{
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                {row.sku}
              </Typography>
              {row.inTrash && (
                <Alert severity="warning">{copy.unavailable}</Alert>
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "minmax(0,1fr)",
                    sm: "repeat(2,minmax(0,1fr))",
                  },
                  gap: 2,
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label={copy.price}
                  value={text.price}
                  disabled={busy || row.inTrash || readOnly}
                  slotProps={{
                    htmlInput: {
                      inputMode: "decimal",
                      "aria-label": `${copy.price} — ${row.sku}`,
                    },
                  }}
                  error={!!validation?.priceError}
                  helperText={
                    validation?.priceError
                      ? copy.invalidPrice
                      : copy.current.replace("{price}", money(row.priceCents))
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((current) => ({
                      ...current,
                      [row.id]: { ...current[row.id], price: value },
                    }));
                    setRebased(false);
                  }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label={copy.compare}
                  value={text.compare}
                  disabled={busy || row.inTrash || readOnly}
                  slotProps={{
                    htmlInput: {
                      inputMode: "decimal",
                      "aria-label": `${copy.compare} — ${row.sku}`,
                    },
                  }}
                  error={!!validation?.compareError}
                  helperText={
                    validation?.compareError
                      ? copy.invalidCompare
                      : row.compareAtPriceCents === null
                        ? copy.emptyCompare
                        : copy.current.replace(
                            "{price}",
                            money(row.compareAtPriceCents),
                          )
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((current) => ({
                      ...current,
                      [row.id]: { ...current[row.id], compare: value },
                    }));
                    setRebased(false);
                  }}
                />
              </Box>
              {drafts[row.id] && (
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => remove(row.id)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {copy.removeRow}
                </Button>
              )}
            </Stack>
          );
        })}
      <Typography role="status" variant="body2">
        {copy.dirtyCount.replace("{count}", String(changed.length))}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          disabled={busy || !valid || readOnly}
          onClick={() => setConfirm(true)}
        >
          {busy ? copy.saving : copy.review}
        </Button>
        <Button disabled={busy} onClick={() => void refresh()}>
          {copy.reload}
        </Button>
        <Button
          disabled={busy || !dirty}
          onClick={() => {
            setDrafts({});
            setError(null);
            setRebased(false);
          }}
        >
          {copy.reset}
        </Button>
      </Stack>
      {confirm && (
        <Dialog
          open
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
          fullWidth
          maxWidth="sm"
          aria-labelledby="price-batch-review-title"
        >
          <DialogTitle id="price-batch-review-title">
            {copy.reviewTitle}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              {parsed.map((item) => (
                <Stack key={item.row.id} spacing={1}>
                  <Typography
                    sx={{ overflowWrap: "anywhere", fontWeight: 600 }}
                  >
                    {item.row.sku}
                  </Typography>
                  <Typography variant="body2">
                    {copy.before}: {money(item.row.priceCents)} /{" "}
                    {item.row.compareAtPriceCents === null
                      ? copy.emptyCompare
                      : money(item.row.compareAtPriceCents)}
                  </Typography>
                  <Typography variant="body2">
                    {copy.after}: {money(item.price ?? 0)} /{" "}
                    {item.compare === null
                      ? copy.emptyCompare
                      : money(item.compare)}
                  </Typography>
                  <Divider />
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button disabled={busy} onClick={() => setConfirm(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant="contained"
              disabled={busy || !valid || readOnly}
              onClick={() => void save()}
            >
              {copy.apply}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
