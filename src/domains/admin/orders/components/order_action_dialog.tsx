"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { orderMutationSchema } from "../services/order_schemas";
import type {
  OrderDetailDto,
  OrderFulfillment,
  OrderMutationParams,
} from "../types/api_params";
import { parseQuantity } from "./order_format";
export type OrderAction =
  | "confirm"
  | "cancel"
  | "paid"
  | "pending"
  | "fulfillment"
  | "return";
export function nextOrderFulfillment(
  order: OrderDetailDto,
): OrderFulfillment | null {
  if (order.status !== "confirmed") return null;
  if (order.fulfillment === "pending") return "preparing";
  if (order.fulfillment === "preparing")
    return order.delivery === "shipping" ? "shipped" : "ready";
  if (order.fulfillment === "shipped" || order.fulfillment === "ready")
    return "delivered";
  return null;
}
export function canCancelOrder(order: OrderDetailDto): boolean {
  return (
    order.status === "draft" ||
    (order.status === "confirmed" &&
      ["pending", "preparing", "ready"].includes(order.fulfillment))
  );
}
export function canReturnOrder(order: OrderDetailDto): boolean {
  return (
    order.status === "confirmed" &&
    (order.fulfillment === "delivered" ||
      (order.delivery === "shipping" && order.fulfillment === "shipped")) &&
    order.lines.some((l) => l.received < l.quantity)
  );
}
export function OrderActionDialog({
  dictionary,
  order,
  action,
  busy,
  onClose,
  onApply,
}: {
  dictionary: Dictionary;
  order: OrderDetailDto;
  action: OrderAction;
  busy: boolean;
  onClose: () => void;
  onApply: (payload: OrderMutationParams) => void;
}) {
  const c = dictionary.admin.orders;
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<
    Record<string, { received: string; resellable: string }>
  >({});
  const [invalid, setInvalid] = useState(false);
  const title =
    action === "confirm"
      ? c.confirm
      : action === "cancel"
        ? c.cancel
        : action === "return"
          ? c.return
          : action === "fulfillment"
            ? c.fulfillmentAction
            : action === "paid"
              ? c.markPaid
              : c.markPending;
  const hint =
    action === "confirm"
      ? c.confirmHint
      : action === "cancel"
        ? c.cancelHint
        : action === "return"
          ? c.returnHint
          : action === "fulfillment"
            ? null
            : c.paymentHint;
  function apply() {
    const base = {
      operationId: crypto.randomUUID(),
      expectedRevision: order.revision,
    };
    let payload: OrderMutationParams;
    if (action === "confirm") payload = { ...base, kind: "confirm" };
    else if (action === "cancel") payload = { ...base, kind: "cancel", reason };
    else if (action === "return")
      payload = {
        ...base,
        kind: "return",
        reason,
        rows: Object.entries(rows)
          .filter(
            ([, r]) =>
              (r.received !== "" && r.received !== "0") ||
              (r.resellable !== "" && r.resellable !== "0"),
          )
          .map(([lineId, row]) => ({
            lineId,
            received: parseQuantity(row.received) ?? -1,
            resellable: parseQuantity(row.resellable) ?? -1,
          })),
      };
    else if (action === "fulfillment") {
      const next = nextOrderFulfillment(order);
      if (!next) return;
      payload = { ...base, kind: "fulfillment", fulfillment: next };
    } else
      payload = {
        ...base,
        kind: "payment",
        payment: action === "paid" ? "paid" : "pending",
        ...(reason.trim() ? { reason } : {}),
      };
    const parsed = orderMutationSchema.safeParse(payload);
    if (
      !parsed.success ||
      (action === "pending" && reason.trim().length < 3) ||
      (payload.kind === "return" &&
        payload.rows.some(
          (r) =>
            r.received >
            (order.lines.find((l) => l.id === r.lineId)?.quantity ?? 0) -
              (order.lines.find((l) => l.id === r.lineId)?.received ?? 0),
        ))
    ) {
      setInvalid(true);
      return;
    }
    onApply(parsed.data);
  }
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {hint && <Alert severity="info">{hint}</Alert>}
          {action === "confirm" && (
            <Stack>
              <Typography fontWeight={600}>{c.confirmStock}</Typography>
              {order.lines.map((l) => (
                <Typography
                  key={l.id}
                  variant="body2"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {l.sku} · {l.quantity} {l.quantity === 1 ? c.unit : c.units}
                </Typography>
              ))}
            </Stack>
          )}
          {action === "fulfillment" && (
            <Typography>
              {c.fulfillments[order.fulfillment]} →{" "}
              {c.fulfillments[nextOrderFulfillment(order) ?? order.fulfillment]}
            </Typography>
          )}
          {(action === "cancel" || action === "return") &&
            order.payment === "paid" && (
              <Alert severity="warning">{c.refundWarning}</Alert>
            )}
          {(action === "cancel" ||
            action === "return" ||
            action === "pending") && (
            <TextField
              fullWidth
              required
              autoFocus
              label={c.reason}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
            />
          )}
          {action === "return" &&
            order.lines
              .filter((l) => l.received < l.quantity)
              .map((l) => (
                <Stack key={l.id} spacing={1}>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                    {l.productName} · {l.sku} ({c.returned}: {l.received}/
                    {l.quantity})
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    {(["received", "resellable"] as const).map((key) => (
                      <TextField
                        key={key}
                        size="small"
                        label={`${c[key]} · ${l.sku}`}
                        value={rows[l.id]?.[key] ?? ""}
                        disabled={busy}
                        inputProps={{ inputMode: "numeric", maxLength: 9 }}
                        onChange={(e) =>
                          setRows({
                            ...rows,
                            [l.id]: {
                              received: rows[l.id]?.received ?? "",
                              resellable: rows[l.id]?.resellable ?? "0",
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    ))}
                  </Box>
                </Stack>
              ))}
          {invalid && <Alert severity="error">{c.validation}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, p: 2 }}>
        <Button disabled={busy} onClick={onClose}>
          {c.close}
        </Button>
        <Button variant="contained" disabled={busy} onClick={apply}>
          {c.apply}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
