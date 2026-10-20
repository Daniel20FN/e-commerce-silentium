"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type {
  InventoryApiResponse,
  InventoryMinimumParams,
  InventoryMutationApiResponse,
  InventoryVariantDto,
} from "../types/api_params";
import {
  clearPending,
  readPendingMinimum,
  savePendingMinimum,
} from "./inventory_pending_intent";
export function InventoryMinimumEditor({
  dictionary,
  variant,
  productId,
  onStateChange,
  onClose,
  onSaved,
}: {
  dictionary: Dictionary;
  variant: InventoryVariantDto;
  productId: string;
  onStateChange: (state: AdminEditorState) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const copy = dictionary.admin.inventory;
  const [baseline, setBaseline] = useState(variant);
  const [value, setValue] = useState(() => {
    const pending = readPendingMinimum(productId);
    const amount = pending ? pending.payload.minimum : variant.minimum;
    return amount === null ? "" : String(amount);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [intent, setIntent] = useState<InventoryMinimumParams | null>(
    () => readPendingMinimum(productId)?.payload ?? null,
  );
  const [readonly, setReadonly] = useState(false);
  const flight = useRef(false);
  const errorFocus = useRef<HTMLDivElement>(null);
  const parsed =
    value.trim() === ""
      ? null
      : /^\d+$/.test(value) && Number(value) <= 999999999
        ? Number(value)
        : undefined;
  const dirty = parsed !== baseline.minimum;
  useEffect(() => onStateChange({ busy, dirty }), [busy, dirty, onStateChange]);
  useEffect(() => {
    if (error) errorFocus.current?.focus();
  }, [error]);
  const save = async () => {
    if (flight.current || parsed === undefined || !dirty || readonly) return;
    const payload = intent ?? {
      operationId: crypto.randomUUID(),
      variantId: baseline.id,
      expectedRevision: baseline.revision,
      minimum: parsed,
    };
    setIntent(payload);
    savePendingMinimum(productId, payload, baseline);
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiService.patch<
        InventoryMutationApiResponse,
        InventoryMinimumParams
      >(`/admin/products/${productId}/inventory`, payload);
      if (!result) throw new Error("empty_response");
      clearPending(productId, "minimum");
      onSaved();
    } catch (reason) {
      setConflict(
        reason instanceof Error &&
          (reason.message.includes("conflict") ||
            [
              "variant_in_trash",
              "product_read_only",
              "inventory_operation_reused",
              "record_not_found",
            ].includes(reason.message)),
      );
      setError(
        reason instanceof Error && reason.message.includes("conflict")
          ? copy.conflict
          : copy.error,
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (flight.current || (intent && !conflict)) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await apiService.get<InventoryApiResponse, undefined>(
        `/admin/products/${productId}/inventory`,
      );
      const row = data?.variants.find((item) => item.id === variant.id);
      if (!data || !row) throw new Error("empty_response");
      setBaseline(row);
      setReadonly(data.readOnly || row.inTrash);
      setIntent(null);
      clearPending(productId, "minimum");
    } catch {
      setError(copy.error);
    } finally {
      setBusy(false);
      flight.current = false;
    }
  };
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => !busy && onClose()}
      aria-labelledby="inventory-minimum-title"
    >
      <DialogTitle id="inventory-minimum-title">
        {copy.minimumTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            {variant.sku}
          </Typography>
          <Typography variant="body2">{copy.minimumReview}</Typography>
          {error && (
            <Alert severity="error" ref={errorFocus} tabIndex={-1}>
              {error}
            </Alert>
          )}
          {readonly && <Alert severity="info">{copy.readonly}</Alert>}
          {intent && <Alert severity="info">{copy.retryHelp}</Alert>}
          <TextField
            label={copy.minimum}
            value={value}
            disabled={busy || !!intent || readonly}
            error={parsed === undefined}
            helperText={parsed === undefined ? copy.invalid : copy.minimumHelp}
            onChange={(event) => setValue(event.target.value)}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
          <Typography variant="body2">
            {copy.before}: {baseline.minimum ?? copy.noMinimum} / {copy.after}:{" "}
            {parsed ?? copy.noMinimum}
          </Typography>
          <Button
            variant="outlined"
            disabled={busy || (!!intent && !conflict)}
            onClick={() => void refresh()}
          >
            {copy.reload}
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button variant="outlined" disabled={busy} onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={busy || parsed === undefined || !dirty || readonly}
          onClick={() => void save()}
        >
          {intent ? copy.retry : copy.saveMinimum}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
