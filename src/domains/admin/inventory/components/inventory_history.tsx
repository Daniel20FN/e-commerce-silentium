"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type {
  InventoryData,
  InventoryMovementDto,
  InventoryQueryParams,
} from "../types/api_params";
export function InventoryHistory({
  dictionary,
  data,
  busy,
  disableReversal,
  onFilter,
  onMore,
  onReverse,
}: {
  dictionary: Dictionary;
  data: InventoryData;
  busy: boolean;
  disableReversal: boolean;
  onFilter: (query: InventoryQueryParams) => void;
  onMore: () => void;
  onReverse: (movement: InventoryMovementDto) => void;
}) {
  const copy = dictionary.admin.inventory;
  const [variantId, setVariant] = useState("");
  const [type, setType] = useState<InventoryQueryParams["type"]>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reference, setReference] = useState("");
  const invalid = !!from && !!to && from > to;
  return (
    <Stack spacing={2} component="section" sx={{ pt: 2, minWidth: 0 }}>
      <Typography component="h2" variant="h6">
        {copy.history}
      </Typography>
      <Box component="details">
        <Typography component="summary" sx={{ cursor: "pointer" }}>
          {copy.filters}
        </Typography>
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField
            select
            size="small"
            label={copy.variant}
            value={variantId}
            disabled={busy}
            onChange={(event) => setVariant(event.target.value)}
          >
            <MenuItem value="">{copy.all}</MenuItem>
            {data.variants.map((row) => (
              <MenuItem key={row.id} value={row.id}>
                {row.sku}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={copy.kind}
            value={type ?? ""}
            disabled={busy}
            onChange={(event) => {
              const value = event.target.value;
              setType(
                value === "entry" ||
                  value === "exit" ||
                  value === "count" ||
                  value === "initial" ||
                  value === "maintenance" ||
                  value === "reversal"
                  ? value
                  : undefined,
              );
            }}
          >
            <MenuItem value="">{copy.all}</MenuItem>
            {Object.entries(copy.kinds).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={copy.from}
              value={from}
              disabled={busy}
              onChange={(event) => setFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={copy.to}
              value={to}
              disabled={busy}
              onChange={(event) => setTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <TextField
            size="small"
            label={copy.filterReference}
            value={reference}
            disabled={busy}
            onChange={(event) => setReference(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          {invalid && <Alert severity="error">{copy.invalidDates}</Alert>}
          <Button
            variant="outlined"
            disabled={busy || invalid}
            onClick={() =>
              onFilter({
                ...(variantId ? { variantId } : {}),
                ...(type ? { type } : {}),
                ...(from
                  ? { from: new Date(`${from}T00:00:00`).toISOString() }
                  : {}),
                ...(to
                  ? { to: new Date(`${to}T23:59:59.999`).toISOString() }
                  : {}),
                ...(reference.trim() ? { reference: reference.trim() } : {}),
              })
            }
          >
            {copy.filter}
          </Button>
        </Stack>
      </Box>
      {data.movements.length === 0 && (
        <Typography variant="body2">{copy.historyEmpty}</Typography>
      )}
      {data.movements.map((row) => {
        const variant = data.variants.find((item) => item.id === row.variantId);
        const reversible =
          !data.readOnly &&
          !variant?.inTrash &&
          !!variant &&
          !row.reversedById &&
          !row.orderLinked &&
          (row.type === "entry" || row.type === "exit" || row.type === "count");
        return (
          <Stack
            key={row.id}
            spacing={0.75}
            sx={{
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              minWidth: 0,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              gap={1}
              flexWrap="wrap"
            >
              <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                {row.sku}
              </Typography>
              <Typography variant="body2">
                {row.type ? copy.kinds[row.type] : copy.kinds.maintenance}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {copy.before}: {row.before} / {copy.after}: {row.after} /{" "}
              {copy.change}: {row.delta > 0 ? `+${row.delta}` : row.delta}
            </Typography>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              {copy.reason}:{" "}
              {row.type === "initial"
                ? (Object.entries(copy.initialReasons).find(
                    ([key]) => key === row.reason,
                  )?.[1] ?? row.reason)
                : row.orderLinked &&
                    row.type === "exit" &&
                    row.reason === "order_confirmation"
                  ? copy.orderConfirmation
                  : row.reason}
            </Typography>
            {row.orderLinked && (
              <Typography variant="caption" color="text.secondary">
                {copy.orderLinkedHint}
              </Typography>
            )}
            {row.reference && (
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {copy.filterReference}: {row.reference}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {copy.actor}: {row.actorLabel ?? copy.system} / {copy.date}:{" "}
              {new Date(row.createdAt).toLocaleString("es-CO")}
            </Typography>
            {row.reversedById ? (
              <Typography variant="body2">{copy.reversed}</Typography>
            ) : reversible ? (
              <Button
                variant="outlined"
                size="small"
                disabled={busy || disableReversal}
                sx={{ alignSelf: "flex-start" }}
                onClick={() => onReverse(row)}
              >
                {copy.reverse}
              </Button>
            ) : null}
          </Stack>
        );
      })}
      {data.nextCursor && (
        <Button variant="outlined" disabled={busy} onClick={onMore}>
          {copy.more}
        </Button>
      )}
    </Stack>
  );
}
