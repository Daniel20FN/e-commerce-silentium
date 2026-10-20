"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InventoryApiResponse,
  InventoryData,
  InventoryKind,
  InventoryMovementDto,
  InventoryMutationApiResponse,
  InventoryMutationParams,
  InventoryQueryParams,
  InventoryRowParams,
  InventoryVariantDto,
} from "../types/api_params";
import { InventoryHistory } from "./inventory_history";
import { InventoryMinimumEditor } from "./inventory_minimum_editor";
import {
  clearPending,
  readPendingBatch,
  readPendingMinimum,
  savePendingBatch,
} from "./inventory_pending_intent";

interface Draft {
  quantity: string;
  reason: string;
  reference: string;
  movement?: InventoryMovementDto;
}
const integer = (value: string): number | null =>
  /^\d+$/.test(value) &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) <= 999999999
    ? Number(value)
    : null;
export function InventoryPanel({
  dictionary,
  productId,
  onStateChange,
}: {
  dictionary: Dictionary;
  productId: string;
  onStateChange: (state: AdminEditorState) => void;
}) {
  const copy = dictionary.admin.inventory;
  const endpoint = `/admin/products/${productId}/inventory`;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [kind, setKind] = useState<InventoryKind>("entry");
  const [query, setQuery] = useState<InventoryQueryParams>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rebased, setRebased] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [minimum, setMinimum] = useState<InventoryVariantDto | null>(null);
  const [minimumState, setMinimumState] = useState<AdminEditorState>({
    busy: false,
    dirty: false,
  });
  const [conflict, setConflict] = useState(false);
  const [intent, setIntent] = useState<InventoryMutationParams | null>(null);
  const inFlight = useRef(false);
  const errorFocus = useRef<HTMLDivElement>(null);
  const dirty = Object.keys(drafts).length > 0;
  const combinedBusy = busy || minimumState.busy;
  const reportMinimum = useCallback(
    (next: AdminEditorState) =>
      setMinimumState((current) =>
        current.busy === next.busy && current.dirty === next.dirty
          ? current
          : next,
      ),
    [],
  );
  useEffect(
    () =>
      onStateChange({ busy: combinedBusy, dirty: dirty || minimumState.dirty }),
    [combinedBusy, dirty, minimumState.dirty, onStateChange],
  );
  useEffect(() => {
    if (error) errorFocus.current?.focus();
  }, [error]);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setBusy(true);
    void apiService
      .get<InventoryApiResponse, InventoryQueryParams>(
        endpoint,
        {},
        undefined,
        controller.signal,
      )
      .then((result) => {
        if (alive) {
          if (!result) throw new Error("empty_response");
          const pending = readPendingBatch(productId);
          if (pending) {
            setIntent(pending.payload);
            setKind(pending.payload.kind);
            setDrafts(
              Object.fromEntries(
                pending.payload.rows.map((row) => {
                  const movement = pending.movements.find(
                    (item) => item.id === row.reversesId,
                  );
                  return [
                    row.variantId,
                    {
                      quantity: String(row.quantity),
                      reason: row.reason,
                      reference: row.reference ?? "",
                      ...(movement
                        ? { movement: { ...movement, type: movement.type } }
                        : {}),
                    },
                  ];
                }),
              ),
            );
            setData({
              ...result,
              variants: result.variants.map(
                (row) =>
                  pending.variants.find((old) => old.id === row.id) ?? row,
              ),
            });
          } else setData(result);
          const pendingMin = readPendingMinimum(productId);
          if (pendingMin) setMinimum(pendingMin.variant);
        }
      })
      .catch(() => {
        if (alive) setError(copy.error);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [endpoint, copy.error, productId, loadVersion]);
  const read = async (next: InventoryQueryParams, append = false) => {
    const result = await apiService.get<
      InventoryApiResponse,
      InventoryQueryParams
    >(endpoint, next);
    if (!result) throw new Error("empty_response");
    setData((current) => ({
      ...result,
      movements:
        append && current
          ? [
              ...current.movements,
              ...result.movements.filter(
                (row) => !current.movements.some((old) => old.id === row.id),
              ),
            ]
          : result.movements,
    }));
    return result;
  };
  const refresh = async (next = query, append = false) => {
    if (
      !data &&
      (readPendingBatch(productId) || readPendingMinimum(productId))
    ) {
      setLoadVersion((value) => value + 1);
      return;
    }
    if (inFlight.current || (intent && !conflict)) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setSuccess(false);
    setConfirm(false);
    try {
      const fresh = await read(next, append);
      if (!append) {
        setQuery(next);
        setIntent(null);
        clearPending(productId, "batch");
        setConflict(false);
        setRebased(dirty);
        setData(
          (current) =>
            current && {
              ...current,
              variants: [
                ...fresh.variants,
                ...(data?.variants ?? [])
                  .filter(
                    (row) =>
                      drafts[row.id] &&
                      !fresh.variants.some((item) => item.id === row.id),
                  )
                  .map((row) => ({ ...row, inTrash: true })),
              ],
            },
        );
      }
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  };
  const parsed = Object.entries(drafts).map(([id, draft]) => {
    const variant = data?.variants.find((row) => row.id === id);
    const quantity = integer(draft.quantity);
    const delta =
      kind === "reversal"
        ? -(draft.movement?.delta ?? 0)
        : kind === "count"
          ? (quantity ?? 0) - (variant?.stock ?? 0)
          : kind === "exit"
            ? -(quantity ?? 0)
            : (quantity ?? 0);
    const after = (variant?.stock ?? 0) + delta;
    const valid =
      !!variant &&
      !variant.inTrash &&
      quantity !== null &&
      (kind === "count" || kind === "reversal" || quantity > 0) &&
      draft.reason.trim().length >= 3 &&
      draft.reason.trim().length <= 500 &&
      draft.reference.length <= 120 &&
      after >= 0 &&
      after <= 999999999;
    return { id, draft, variant, quantity, after, valid };
  });
  const valid =
    parsed.length > 0 &&
    parsed.length <= 25 &&
    parsed.every((row) => row.valid) &&
    !data?.readOnly;
  const save = async () => {
    if (inFlight.current || !valid || minimumState.busy) return;
    const rows: InventoryRowParams[] = parsed.flatMap((row) =>
      row.variant && row.quantity !== null
        ? [
            {
              variantId: row.id,
              expectedRevision: row.variant.revision,
              quantity: row.quantity,
              reason: row.draft.reason.trim(),
              ...(row.draft.reference.trim()
                ? { reference: row.draft.reference.trim() }
                : {}),
              ...(row.draft.movement
                ? { reversesId: row.draft.movement.id }
                : {}),
            },
          ]
        : [],
    );
    const payload = intent ?? { operationId: crypto.randomUUID(), kind, rows };
    setIntent(payload);
    savePendingBatch(
      productId,
      payload,
      parsed.flatMap((row) => (row.variant ? [row.variant] : [])),
      parsed.flatMap((row) => (row.draft.movement ? [row.draft.movement] : [])),
    );
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setSuccess(false);
    setConfirm(false);
    try {
      const result = await apiService.post<
        InventoryMutationApiResponse,
        InventoryMutationParams
      >(endpoint, payload);
      if (!result) throw new Error("empty_response");
      setDrafts({});
      clearPending(productId, "batch");
      setIntent(null);
      setRebased(false);
      setSuccess(true);
      try {
        await read(query);
      } catch {
        setError(copy.savedRefreshError);
      }
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "";
      setConflict(
        code.includes("conflict") ||
          [
            "variant_in_trash",
            "product_read_only",
            "inventory_balance_invalid",
            "inventory_reversal_invalid",
            "inventory_operation_reused",
            "record_not_found",
          ].includes(code),
      );
      setError(
        code.includes("conflict") || code === "inventory_revision_conflict"
          ? copy.conflict
          : code.includes("read_only")
            ? copy.readonly
            : copy.error,
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  };
  const change = (id: string, patch: Partial<Draft>) => {
    setSuccess(false);
    setRebased(false);
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };
  const prepareReversal = (movement: InventoryMovementDto) => {
    setKind("reversal");
    setDrafts({
      [movement.variantId]: {
        quantity: String(Math.abs(movement.delta)),
        reason: "",
        reference: "",
        movement,
      },
    });
    setSuccess(false);
    setRebased(false);
  };
  return (
    <Stack spacing={2} data-ui="inventory-panel" sx={{ minWidth: 0 }}>
      <Typography component="h2" variant="h6">
        {copy.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {copy.help}
      </Typography>
      {error && (
        <Alert severity="error" tabIndex={-1} ref={errorFocus}>
          {error}
        </Alert>
      )}
      {success && <Alert severity="success">{copy.saved}</Alert>}
      {rebased && <Alert severity="info">{copy.rebased}</Alert>}
      {data?.readOnly && <Alert severity="info">{copy.readonly}</Alert>}
      {busy && <Typography role="status">{copy.loading}</Typography>}
      {data && (
        <>
          {!data.readOnly && (
            <TextField
              select
              size="small"
              label={copy.kind}
              value={kind}
              disabled={combinedBusy || dirty || !!intent}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "entry" || next === "exit" || next === "count")
                  setKind(next);
              }}
              sx={{ maxWidth: 320 }}
            >
              {(["entry", "exit", "count"] as const).map((value) => (
                <MenuItem key={value} value={value}>
                  {copy.kinds[value]}
                </MenuItem>
              ))}
              {kind === "reversal" && (
                <MenuItem value="reversal">{copy.kinds.reversal}</MenuItem>
              )}
            </TextField>
          )}
          {data.variants.length === 0 && (
            <Alert severity="info">{copy.empty}</Alert>
          )}
          {data.variants.map((row) => {
            const draft = drafts[row.id],
              result = parsed.find((item) => item.id === row.id);
            const locked =
              combinedBusy || !!intent || data.readOnly || row.inTrash;
            return (
              <Stack
                key={row.id}
                spacing={1.5}
                sx={{
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  minWidth: 0,
                }}
              >
                <Stack
                  direction="row"
                  gap={1}
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <Typography
                    sx={{ overflowWrap: "anywhere", fontWeight: 600 }}
                  >
                    {row.sku}
                  </Typography>
                  <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {copy.stock}: {row.stock}
                  </Typography>
                  {row.stock === 0 ? (
                    <Chip size="small" variant="outlined" label={copy.out} />
                  ) : row.minimum !== null && row.stock <= row.minimum ? (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={copy.low}
                    />
                  ) : null}
                  {row.inTrash && <Chip size="small" label={copy.trash} />}
                  {!row.active && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={copy.inactive}
                    />
                  )}
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1}
                  alignItems={{ sm: "center" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {copy.minimum}: {row.minimum ?? copy.noMinimum}
                  </Typography>
                  {!data.readOnly && !row.inTrash && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={combinedBusy || dirty || !!minimum}
                      onClick={() => setMinimum(row)}
                    >
                      {copy.editMinimum}
                    </Button>
                  )}
                  {!draft &&
                    !data.readOnly &&
                    !row.inTrash &&
                    kind !== "reversal" && (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={locked || !!minimum || parsed.length >= 25}
                        onClick={() =>
                          change(row.id, {
                            quantity: "",
                            reason: "",
                            reference: "",
                          })
                        }
                      >
                        {copy.add}
                      </Button>
                    )}
                </Stack>
                {draft && (
                  <>
                    {row.inTrash && (
                      <Alert severity="warning">{copy.unavailable}</Alert>
                    )}
                    {draft.movement && (
                      <Alert severity="info">{copy.reverseHelp}</Alert>
                    )}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "minmax(0,1fr)",
                          sm: "minmax(0,1fr) minmax(0,2fr)",
                        },
                        gap: 2,
                      }}
                    >
                      <TextField
                        size="small"
                        label={
                          kind === "count" ? copy.countQuantity : copy.quantity
                        }
                        value={draft.quantity}
                        disabled={locked || kind === "reversal"}
                        onChange={(event) =>
                          change(row.id, { quantity: event.target.value })
                        }
                        slotProps={{
                          htmlInput: {
                            inputMode: "numeric",
                            "aria-label": `${copy.quantity} — ${row.sku}`,
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        label={copy.reason}
                        value={draft.reason}
                        disabled={locked}
                        onChange={(event) =>
                          change(row.id, { reason: event.target.value })
                        }
                        slotProps={{
                          htmlInput: {
                            maxLength: 500,
                            "aria-label": `${copy.reason} — ${row.sku}`,
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        label={copy.reference}
                        value={draft.reference}
                        disabled={locked}
                        onChange={(event) =>
                          change(row.id, { reference: event.target.value })
                        }
                        slotProps={{
                          htmlInput: {
                            maxLength: 120,
                            "aria-label": `${copy.reference} — ${row.sku}`,
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2">
                      {copy.before}: {row.stock} / {copy.after}: {result?.after}
                    </Typography>
                    {!result?.valid &&
                      draft.quantity !== "" &&
                      draft.reason !== "" && (
                        <Typography color="error" variant="body2">
                          {copy.invalid}
                        </Typography>
                      )}
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ alignSelf: "flex-start" }}
                      disabled={combinedBusy || !!intent}
                      onClick={() =>
                        setDrafts((current) => {
                          const next = { ...current };
                          delete next[row.id];
                          return next;
                        })
                      }
                    >
                      {copy.remove}
                    </Button>
                  </>
                )}
              </Stack>
            );
          })}
        </>
      )}
      {dirty && (
        <Typography role="status" variant="body2">
          {copy.selected.replace("{count}", String(parsed.length))}
        </Typography>
      )}
      {intent && <Alert severity="info">{copy.retryHelp}</Alert>}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} flexWrap="wrap">
        {!data?.readOnly && (
          <Button
            variant="contained"
            disabled={combinedBusy || !valid || !!minimum}
            onClick={() => setConfirm(true)}
          >
            {intent ? copy.retry : copy.review}
          </Button>
        )}
        <Button
          variant="outlined"
          disabled={combinedBusy || !!minimum || (!!intent && !conflict)}
          onClick={() => void refresh()}
        >
          {copy.reload}
        </Button>
        {dirty && (
          <Button
            variant="outlined"
            disabled={combinedBusy || !!intent}
            onClick={() => {
              setDrafts({});
              setError(null);
              setRebased(false);
            }}
          >
            {copy.reset}
          </Button>
        )}
      </Stack>
      {data && (
        <InventoryHistory
          dictionary={dictionary}
          data={data}
          busy={combinedBusy || (!!intent && !conflict)}
          disableReversal={dirty || !!minimum || !!intent}
          onFilter={(next) => void refresh(next)}
          onMore={() =>
            void refresh(
              { ...query, cursor: data.nextCursor ?? undefined },
              true,
            )
          }
          onReverse={prepareReversal}
        />
      )}
      {confirm && (
        <Dialog
          open
          fullWidth
          maxWidth="sm"
          onClose={() => !busy && setConfirm(false)}
          aria-labelledby="inventory-confirm-title"
        >
          <DialogTitle id="inventory-confirm-title">
            {kind === "reversal" ? copy.reverseTitle : copy.reviewTitle}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              {parsed.map((row) => (
                <Stack key={row.id} spacing={1}>
                  <Typography
                    sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
                  >
                    {row.variant?.sku}
                  </Typography>
                  <Typography>
                    {copy.before}: {row.variant?.stock} / {copy.after}:{" "}
                    {row.after}
                  </Typography>
                  <Typography sx={{ overflowWrap: "anywhere" }}>
                    {copy.reason}: {row.draft.reason}
                  </Typography>
                  {row.draft.reference && (
                    <Typography>
                      {copy.reference}: {row.draft.reference}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" onClick={() => setConfirm(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant="contained"
              disabled={busy || !valid}
              onClick={() => void save()}
            >
              {copy.apply}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {minimum && (
        <InventoryMinimumEditor
          dictionary={dictionary}
          variant={minimum}
          productId={productId}
          onStateChange={reportMinimum}
          onClose={() => {
            setMinimum(null);
            setMinimumState({ dirty: false, busy: false });
          }}
          onSaved={() => {
            setMinimum(null);
            setMinimumState({ dirty: false, busy: false });
            void refresh();
          }}
        />
      )}
    </Stack>
  );
}
