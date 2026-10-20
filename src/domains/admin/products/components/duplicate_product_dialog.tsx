"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import {
  readDuplicateIntent,
  storeDuplicateIntent,
} from "../services/duplicate_intent_storage";
import { productWorkspaceHref } from "../services/product_workspace_links";
import type {
  AdminDuplicateProductApiResponse,
  AdminDuplicateProductData,
  AdminDuplicateProductParams,
  AdminProductDetailApiResponse,
} from "../types/api_params";
import type { AdminProductDetailDto } from "../types/product_dto";

export function DuplicateProductDialog({
  dictionary,
  product,
  open,
  returnTo,
  onClose,
  onBusyChange,
}: {
  dictionary: Dictionary;
  product: AdminProductDetailDto;
  open: boolean;
  returnTo: string;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const copy = dictionary.admin.products.operations;
  const [storedIntent] = useState(() => readDuplicateIntent(product.id));
  const [copyCosts, setCopyCosts] = useState(storedIntent?.copyCosts ?? false);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(storedIntent !== null);
  const [canRenew, setCanRenew] = useState(false);
  const [result, setResult] = useState<AdminDuplicateProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intent = useRef<AdminDuplicateProductParams | null>(storedIntent);
  const inFlight = useRef(false);
  const sourceRevision = useRef(product.updatedAt);
  const renew = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    try {
      const data = await apiService.get<
        AdminProductDetailApiResponse,
        undefined
      >(`/admin/products/${product.id}`);
      if (!data) throw new Error("empty_response");
      if (
        data.product.inTrash ||
        data.product.archivedAt ||
        data.product.status === "archived"
      )
        throw new Error("product_read_only");
      sourceRevision.current = data.product.updatedAt;
      intent.current = null;
      storeDuplicateIntent(product.id, null);
      setAttempted(false);
      setCanRenew(false);
      setError(null);
    } catch {
      setError(copy.error);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  const run = async () => {
    if (inFlight.current || result) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setAttempted(true);
    setError(null);
    intent.current ??= {
      operationId: crypto.randomUUID(),
      expectedUpdatedAt: sourceRevision.current,
      copyCosts,
    };
    storeDuplicateIntent(product.id, intent.current);
    try {
      const response = await apiService.post<
        AdminDuplicateProductApiResponse,
        AdminDuplicateProductParams
      >(`/admin/products/${product.id}/duplicate`, intent.current);
      if (!response) throw new Error("empty_response");
      setResult(response);
      storeDuplicateIntent(product.id, null);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "";
      setCanRenew(
        code === "product_revision_conflict" || code === "operation_key_reused",
      );
      setError(
        code === "product_revision_conflict"
          ? copy.copyConflict
          : code === "operation_key_reused"
            ? copy.keyReuse
            : copy.error,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="duplicate-product-title"
    >
      <DialogTitle id="duplicate-product-title">
        {copy.duplicateTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>{copy.duplicateHelp}</Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.imageHelp}
          </Typography>
          {!result && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={copyCosts}
                    disabled={busy || attempted}
                    onChange={(_, checked) => setCopyCosts(checked)}
                  />
                }
                label={copy.copyCosts}
              />
              <Typography variant="body2">{copy.costHelp}</Typography>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {attempted && !result && (
            <Typography variant="body2" color="text.secondary">
              {copy.retryHint}
            </Typography>
          )}
          {canRenew && (
            <Button disabled={busy} onClick={() => void renew()}>
              {copy.newAttempt}
            </Button>
          )}
          {result && (
            <>
              <Alert severity="success">{copy.copied}</Alert>
              {result.skippedCategories > 0 && (
                <Alert severity="warning">
                  {copy.skippedCategories.replace(
                    "{count}",
                    String(result.skippedCategories),
                  )}
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button disabled={busy} onClick={onClose}>
          {copy.cancel}
        </Button>
        {result ? (
          <Button
            variant="contained"
            component="a"
            href={productWorkspaceHref(
              result.productId,
              "information",
              returnTo,
            )}
          >
            {copy.openCopy}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void run()}
          >
            {busy ? copy.copyBusy : copy.confirmCopy}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
