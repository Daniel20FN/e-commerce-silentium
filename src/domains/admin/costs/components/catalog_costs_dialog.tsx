"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { apiService } from "@/types/api-service/api_service";
import { priceFormatter } from "@/utils/price_formatter";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { parseCostPesos } from "../services/cost_rules";
import type {
  CatalogCostDto,
  CatalogCostInput,
  CatalogCostLifecycle,
  CatalogCostsApiResponse,
  CatalogCostsData,
  CatalogCostUpdate,
} from "../types/api_params";

type Props = {
  dictionary: Dictionary;
  product: { id: string; name: string };
  onClose: () => void;
};
const money = (cents: number) => priceFormatter(cents / 100);

export function CatalogCostsDialog({ dictionary, product, onClose }: Props) {
  const copy = dictionary.admin.costs;
  const endpoint = `/admin/products/${product.id}/costs`;
  const [data, setData] = useState<CatalogCostsData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<CatalogCostDto | null>(null);
  const [trash, setTrash] = useState(false);
  const [removing, setRemoving] = useState<CatalogCostDto | null>(null);
  const [discard, setDiscard] = useState(false);
  const dirty =
    editing !== null || name !== "" || description !== "" || amount !== "";
  const amountCents = parseCostPesos(amount);
  const variant = data?.variants.find(
    (v) =>
      v.id === (reviewId || data.variants.find((item) => !item.inTrash)?.id),
  );
  const summary = variant ? data?.summaries[variant.id] : undefined;
  const scopeVariant = data?.variants.find((v) => v.id === scope);
  const writable = data?.writable && !scopeVariant?.inTrash;
  const items =
    data?.items.filter(
      (item) =>
        item.variantId === (scope || null) &&
        (trash ? item.deletedAt !== null : item.deletedAt === null),
    ) ?? [];
  const duplicate =
    !!name.trim() &&
    data?.items.some(
      (item) =>
        !item.deletedAt &&
        item.id !== editing?.id &&
        item.variantId === (scope || null) &&
        item.name.toLocaleLowerCase("es").trim() ===
          name.toLocaleLowerCase("es").trim(),
    );
  const message = useCallback(
    (failure: unknown): string => {
      const key = failure instanceof Error ? failure.message : "";
      const entries = Object.entries(copy.errors);
      return (
        entries.find(([code]) => code === key)?.[1] ?? copy.errors.unexpected
      );
    },
    [copy.errors],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void apiService
      .get<CatalogCostsApiResponse, undefined>(
        endpoint,
        undefined,
        undefined,
        controller.signal,
      )
      .then((result) => {
        if (active) {
          if (result) setData(result);
          else setError(copy.errors.unexpected);
        }
      })
      .catch((failure) => {
        if (active) setError(message(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [endpoint, copy.errors.unexpected, message]);

  const reset = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setAmount("");
  };
  const reload = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiService.get<CatalogCostsApiResponse, undefined>(
        endpoint,
      );
      if (!result) throw new Error();
      setData(result);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (amountCents === null || !name.trim()) {
      setError(copy.errors.cost_invalid);
      return;
    }
    const input: CatalogCostInput = {
      variantId: scope || null,
      name: name.trim(),
      description: description.trim() || null,
      amountCents,
    };
    setBusy(true);
    setError(null);
    try {
      const result = editing
        ? await apiService.put<CatalogCostsApiResponse, CatalogCostUpdate>(
            endpoint,
            { ...input, id: editing.id, revision: editing.revision },
          )
        : await apiService.post<CatalogCostsApiResponse, CatalogCostInput>(
            endpoint,
            input,
          );
      if (!result) throw new Error();
      setData(result);
      reset();
      enqueueSnackbar(copy.saved, { variant: "success" });
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const lifecycle = async (
    item: CatalogCostDto,
    action: CatalogCostLifecycle["action"],
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiService.patch<
        CatalogCostsApiResponse,
        CatalogCostLifecycle
      >(endpoint, { id: item.id, revision: item.revision, action });
      if (!result) throw new Error();
      setData(result);
      setRemoving(null);
      enqueueSnackbar(copy.saved, { variant: "success" });
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (!busy) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };

  return (
    <>
      <Dialog
        open
        maxWidth="lg"
        fullWidth
        onClose={close}
        aria-labelledby="catalog-cost-title"
      >
        <DialogTitle id="catalog-cost-title">
          {copy.title} — {product.name}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">{copy.rule}</Alert>
            {error ? (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            ) : null}
            <Button
              onClick={() => void reload()}
              disabled={busy}
              sx={{ alignSelf: "flex-start" }}
            >
              {copy.reload}
            </Button>
            {busy ? (
              <Typography role="status">{copy.loading}</Typography>
            ) : null}
            {data && !data.writable ? (
              <Alert severity="warning">{copy.readOnly}</Alert>
            ) : null}
            {data ? (
              <>
                {variant && summary ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="cost-review-label">
                          {copy.reviewVariant}
                        </InputLabel>
                        <Select
                          labelId="cost-review-label"
                          label={copy.reviewVariant}
                          value={variant.id}
                          disabled={busy}
                          onChange={(event) => setReviewId(event.target.value)}
                        >
                          {data.variants.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.sku} — {item.label}
                              {!item.active ? ` · ${copy.inactive}` : ""}
                              {item.inTrash ? ` · ${copy.inTrash}` : ""}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {!summary.hasCosts ? (
                        <Alert severity="warning">{copy.noCosts}</Alert>
                      ) : null}
                      {summary.marginCents < 0 ? (
                        <Alert severity="warning">{copy.negative}</Alert>
                      ) : null}
                      <Box
                        role="status"
                        aria-live="polite"
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(3, minmax(0, 1fr))",
                          },
                          gap: 2,
                        }}
                      >
                        {[
                          [copy.price, money(variant.priceCents)],
                          [copy.generalTotal, money(summary.generalCents)],
                          [copy.specificTotal, money(summary.specificCents)],
                          [copy.total, money(summary.totalCents)],
                          [copy.margin, money(summary.marginCents)],
                          [
                            copy.percentage,
                            summary.marginPercent === null
                              ? copy.notApplicable
                              : new Intl.NumberFormat("es-CO", {
                                  style: "percent",
                                  maximumFractionDigits: 2,
                                }).format(summary.marginPercent / 100),
                          ],
                        ].map(([label, value]) => (
                          <Box key={label}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {label}
                            </Typography>
                            <Typography fontWeight={600}>{value}</Typography>
                          </Box>
                        ))}
                      </Box>
                      <Divider />
                      {data.items
                        .filter(
                          (item) =>
                            !item.deletedAt &&
                            (item.variantId === null ||
                              item.variantId === variant.id),
                        )
                        .map((item) => (
                          <Stack
                            key={item.id}
                            direction="row"
                            justifyContent="space-between"
                            gap={2}
                          >
                            <Typography
                              variant="body2"
                              sx={{ overflowWrap: "anywhere" }}
                            >
                              {item.name} ·{" "}
                              {item.variantId === null
                                ? copy.general
                                : copy.variant}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {money(item.amountCents)}
                            </Typography>
                          </Stack>
                        ))}
                    </Stack>
                  </Paper>
                ) : (
                  <Alert severity="info">{copy.noVariants}</Alert>
                )}
                <FormControl fullWidth size="small">
                  <InputLabel shrink id="cost-scope-label">
                    {copy.scope}
                  </InputLabel>
                  <Select
                    labelId="cost-scope-label"
                    label={copy.scope}
                    displayEmpty
                    value={scope}
                    disabled={busy}
                    onChange={(event) => {
                      setScope(event.target.value);
                      if (event.target.value) setReviewId(event.target.value);
                    }}
                  >
                    <MenuItem value="">{copy.general}</MenuItem>
                    {data.variants.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.sku} — {item.label}
                        {!item.active ? ` · ${copy.inactive}` : ""}
                        {item.inTrash ? ` · ${copy.inTrash}` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box
                  component="form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                >
                  <Stack spacing={1.5}>
                    <TextField
                      label={copy.name}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={busy || !writable}
                      slotProps={{ htmlInput: { maxLength: 120 } }}
                      required
                      size="small"
                    />
                    <TextField
                      label={copy.description}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={busy || !writable}
                      slotProps={{ htmlInput: { maxLength: 1000 } }}
                      multiline
                      minRows={2}
                      size="small"
                    />
                    <TextField
                      label={copy.amount}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={busy || !writable}
                      helperText={copy.amountHelp}
                      error={!!amount && amountCents === null}
                      slotProps={{ htmlInput: { inputMode: "decimal" } }}
                      required
                      size="small"
                    />
                    {duplicate ? (
                      <Alert severity="warning">{copy.duplicate}</Alert>
                    ) : null}
                    <Stack direction="row" gap={1}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          busy ||
                          !writable ||
                          !name.trim() ||
                          amountCents === null
                        }
                      >
                        {editing ? copy.update : copy.save}
                      </Button>
                      {dirty ? (
                        <Button onClick={reset} disabled={busy}>
                          {copy.cancel}
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
                <Divider />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={trash}
                      disabled={busy}
                      onChange={(event) => setTrash(event.target.checked)}
                    />
                  }
                  label={copy.showTrash}
                />
                <Typography variant="caption" color="text.secondary">
                  {copy.order}
                </Typography>
                {!items.length ? (
                  <Typography>{copy.empty}</Typography>
                ) : (
                  items.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        gap={1.5}
                      >
                        <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                          <Typography fontWeight={600}>
                            {item.name} — {money(item.amountCents)}
                          </Typography>
                          <Typography variant="caption">
                            {item.variantId === null
                              ? copy.general
                              : data.variants.find(
                                  (v) => v.id === item.variantId,
                                )?.sku}
                          </Typography>
                          {item.description ? (
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {item.description}
                            </Typography>
                          ) : null}
                        </Box>
                        <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
                          {item.deletedAt ? (
                            <Button
                              disabled={busy || !writable || dirty}
                              onClick={() => void lifecycle(item, "restore")}
                            >
                              {copy.restore}
                            </Button>
                          ) : (
                            <>
                              <Button
                                disabled={busy || !writable || dirty}
                                onClick={() => {
                                  setEditing(item);
                                  setName(item.name);
                                  setDescription(item.description ?? "");
                                  setAmount(String(item.amountCents / 100));
                                }}
                              >
                                {copy.edit}
                              </Button>
                              <Button
                                color="warning"
                                disabled={busy || !writable || dirty}
                                onClick={() => setRemoving(item)}
                              >
                                {copy.trash}
                              </Button>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))
                )}
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            {copy.close}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={removing !== null}
        onClose={() => {
          if (!busy) setRemoving(null);
        }}
      >
        <DialogTitle>{copy.confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography>{copy.confirmBody}</Typography>
          <Typography fontWeight={600}>
            {removing?.name} — {removing ? money(removing.amountCents) : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setRemoving(null)}>
            {copy.back}
          </Button>
          <Button
            disabled={busy}
            color="warning"
            onClick={() => {
              if (removing) void lifecycle(removing, "trash");
            }}
          >
            {copy.trash}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={discard} onClose={() => setDiscard(false)}>
        <DialogTitle>{copy.discardTitle}</DialogTitle>
        <DialogContent>{copy.discardBody}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscard(false)}>{copy.keepEditing}</Button>
          <Button onClick={onClose}>{copy.discard}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
