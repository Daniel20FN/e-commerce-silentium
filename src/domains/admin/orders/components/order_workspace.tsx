"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { safePriorityReturn } from "@/domains/admin/home/services/operational_rules";
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
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreateOrderParams,
  OrderApiResponse,
  OrderDetailDto,
  OrderMutationApiResponse,
  OrderMutationParams,
  OrderMutationResult,
  SaveOrderDraftParams,
} from "../types/api_params";
import {
  canCancelOrder,
  canReturnOrder,
  nextOrderFulfillment,
  OrderActionDialog,
  type OrderAction,
} from "./order_action_dialog";
import { OrderDraftEditor } from "./order_draft_editor";
import {
  draftToForm,
  emptyOrderForm,
  formToDraft,
  orderToForm,
  type OrderForm,
} from "./order_form";
import {
  orderDate,
  orderMoney,
  parsePrice,
  parseQuantity,
} from "./order_format";
import { OrderHistory } from "./order_history";
import {
  clearOrderPending,
  readOrderPending,
  saveOrderPending,
  type OrderPending,
} from "./order_pending_intent";
const rolledBack = new Set([
  "order_conflict",
  "order_operation_reused",
  "order_not_sellable",
  "order_price_changed",
  "order_stock_insufficient",
  "order_invalid_transition",
  "order_return_invalid",
  "order_price_reason_required",
  "order_total_invalid",
  "order_history_limit",
  "order_catalog_limit",
  "record_not_found",
  "not_valid_params",
  "validation_error",
]);
export function OrderWorkspace({
  dictionary,
  actorId,
  orderId,
  returnTo,
}: {
  dictionary: Dictionary;
  actorId: string;
  orderId?: string;
  returnTo?: string;
}) {
  const c = dictionary.admin.orders;
  const back = safePriorityReturn(returnTo, "/admin/pedidos");
  const backLabel = back.startsWith("/admin/pendientes?")
    ? dictionary.admin.dashboard.operations.backToQueue
    : back === "/admin"
      ? dictionary.admin.dashboard.operations.back
      : c.back;
  const router = useRouter();
  const key = orderId ?? "new";
  const [order, setOrder] = useState<OrderDetailDto | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyOrderForm);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState<OrderPending | null>(null);
  const [conflict, setConflict] = useState(false);
  const [staleView, setStaleView] = useState(false);
  const [action, setAction] = useState<OrderAction | null>(null);
  const [leave, setLeave] = useState<string | null>(null);
  const flight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const read = useCallback(async () => {
    if (!orderId) return null;
    const fresh = await apiService.get<OrderApiResponse, Record<string, never>>(
      `/admin/orders/${orderId}`,
      {},
    );
    if (!fresh) throw Error("empty_response");
    return fresh;
  }, [orderId]);
  useEffect(() => {
    let alive = true;
    setLoading(!!orderId);
    const intent = readOrderPending(actorId, key);
    setPending(intent);
    if (intent) {
      setError(c.unknown);
      if (intent.mode !== "mutate") setForm(draftToForm(intent.payload));
    }
    if (orderId) {
      void read()
        .then((fresh) => {
          if (!alive || !fresh) return;
          setOrder(fresh);
          if (!intent) setForm(orderToForm(fresh));
          else if (intent.mode !== "mutate")
            setForm(draftToForm(intent.payload, fresh));
        })
        .catch(() => {
          if (alive) setError(c.error);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }
    return () => {
      alive = false;
    };
  }, [actorId, key, orderId, read, c.error, c.unknown]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!dirty && !pending && !busy) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    const navigate = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.href === window.location.href
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setLeave(link.href);
    };
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, pending, busy]);
  const disabled = busy || !!pending || conflict || staleView;
  function change(next: OrderForm) {
    setForm(next);
    setDirty(true);
    setSuccess(false);
  }
  async function reload(keep = false) {
    if (flight.current || pending) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await read();
      if (fresh) {
        setOrder(fresh);
        if (!keep) {
          setForm(orderToForm(fresh));
          setDirty(false);
        }
        setConflict(false);
        setStaleView(false);
        setSuccess(false);
        if (keep) setError(c.rebased);
      }
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  }
  async function execute(intent: OrderPending) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(null);
    setSuccess(false);
    setPending(intent);
    setAction(null);
    let result: OrderMutationResult | undefined;
    try {
      if (intent.mode === "create")
        result = await apiService.post<
          OrderMutationApiResponse,
          CreateOrderParams
        >("/admin/orders", intent.payload);
      else if (intent.mode === "save")
        result = await apiService.put<
          OrderMutationApiResponse,
          SaveOrderDraftParams
        >(`/admin/orders/${intent.orderId}`, intent.payload);
      else
        result = await apiService.post<
          OrderMutationApiResponse,
          OrderMutationParams
        >(`/admin/orders/${intent.orderId}`, intent.payload);
      if (!result) throw Error("empty_response");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      if (rolledBack.has(code)) {
        clearOrderPending(actorId, key);
        setPending(null);
        setConflict(!!orderId);
        setError(
          code === "order_stock_insufficient" || code === "order_not_sellable"
            ? c.stockError
            : code === "order_price_changed"
              ? c.priceChanged
              : c.conflict,
        );
      } else setError(c.unknown);
      setBusy(false);
      flight.current = false;
      return;
    }
    clearOrderPending(actorId, key);
    setPending(null);
    setDirty(false);
    setSuccess(true);
    if (intent.mode === "create") {
      router.replace(`/admin/pedidos/${result.orderId}`);
      setBusy(false);
      flight.current = false;
      return;
    }
    try {
      const fresh = await read();
      if (fresh) {
        setOrder(fresh);
        setForm(orderToForm(fresh));
      }
      setStaleView(false);
    } catch {
      setStaleView(true);
      setError(c.refreshFailed);
    } finally {
      setBusy(false);
      flight.current = false;
    }
  }
  function save() {
    const draft = formToDraft(form);
    if (!draft) {
      setError(c.validation);
      return;
    }
    const operationId = crypto.randomUUID();
    const intent = order
      ? saveOrderPending(actorId, key, {
          mode: "save",
          payload: { ...draft, operationId, expectedRevision: order.revision },
        })
      : saveOrderPending(actorId, key, {
          mode: "create",
          payload: { ...draft, operationId },
        });
    void execute(intent);
  }
  function mutate(payload: OrderMutationParams) {
    const intent = saveOrderPending(actorId, key, { mode: "mutate", payload });
    void execute(intent);
  }
  const subtotal = form.lines.reduce(
    (sum, l) =>
      sum + (parsePrice(l.unitPrice) ?? 0) * (parseQuantity(l.quantity) ?? 0),
    0,
  );
  const shipping = parsePrice(form.shipping) ?? 0;
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0, maxWidth: 1100, mx: "auto" }}>
      <Stack
        direction="row"
        gap={1}
        justifyContent="space-between"
        flexWrap="wrap"
      >
        <Button
          disabled={busy}
          onClick={() =>
            dirty || pending ? setLeave(back) : router.push(back)
          }
        >
          {backLabel}
        </Button>
        {orderId && (
          <Button
            disabled={busy || !!pending || dirty}
            onClick={() => void reload()}
          >
            {c.refresh}
          </Button>
        )}
      </Stack>
      <Stack spacing={1}>
        <Typography component="h1" variant="h5" fontWeight={700}>
          {order ? `${c.number} #${order.number}` : c.newTitle}
        </Typography>
        {order && (
          <>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={c.statuses[order.status]}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${c.payment}: ${c.payments[order.payment]}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${c.fulfillment}: ${c.fulfillments[order.fulfillment]}`}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {c.createdBy}: {order.createdByLabel} ·{" "}
              {orderDate(order.createdAt)}
            </Typography>
          </>
        )}
      </Stack>
      {error && (
        <Alert
          ref={errorRef}
          tabIndex={-1}
          severity={conflict ? "warning" : "error"}
        >
          {error}
        </Alert>
      )}
      {success && !error && <Alert severity="success">{c.saved}</Alert>}
      {busy && pending && <Typography role="status">{c.saving}</Typography>}
      {pending && !busy && (
        <Stack gap={1}>
          <Typography variant="body2">{c.discardPending}</Typography>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void execute(pending)}
          >
            {c.retry}
          </Button>
        </Stack>
      )}
      {conflict && (
        <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
          <Button disabled={busy} onClick={() => void reload(false)}>
            {c.reload}
          </Button>
          {order?.status === "draft" && (
            <Button disabled={busy} onClick={() => void reload(true)}>
              {c.rebase}
            </Button>
          )}
        </Stack>
      )}
      {loading && (
        <Stack aria-label={c.loading}>
          <Skeleton height={120} />
          <Skeleton height={200} />
        </Stack>
      )}
      {!loading && (!orderId || order) && (
        <>
          {!order || order.status === "draft" ? (
            <OrderDraftEditor
              dictionary={dictionary}
              form={form}
              disabled={disabled}
              onChange={change}
            />
          ) : (
            <Stack spacing={2.5}>
              <Alert severity="info">{c.lockedHint}</Alert>
              <Stack component="section" spacing={1}>
                <Typography variant="h6" component="h2">
                  {c.customer}
                </Typography>
                <Typography sx={{ overflowWrap: "anywhere" }}>
                  {order.customerName} · {order.customerPhone}
                </Typography>
                <Typography>{c.deliveries[order.delivery]}</Typography>
                {order.address && (
                  <Typography sx={{ overflowWrap: "anywhere" }}>
                    {order.address}
                  </Typography>
                )}
                {order.notes && (
                  <Typography
                    sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}
                  >
                    {order.notes}
                  </Typography>
                )}
              </Stack>
              <Stack component="section" spacing={1}>
                <Typography variant="h6" component="h2">
                  {c.lines}
                </Typography>
                {order.lines.map((l) => (
                  <Box
                    key={l.id}
                    sx={{
                      py: 1.5,
                      borderBottom: 1,
                      borderColor: "divider",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <Typography fontWeight={600}>{l.productName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {l.sku} · {l.attributes}
                    </Typography>
                    <Typography variant="body2">
                      {l.quantity} × {orderMoney(l.unitPriceCents)} ={" "}
                      {orderMoney(l.quantity * l.unitPriceCents)}
                    </Typography>
                    {l.priceReason && (
                      <Typography variant="body2">
                        {c.priceReason}: {l.priceReason}
                      </Typography>
                    )}
                    {l.received > 0 && (
                      <Typography variant="body2">
                        {c.returned}: {l.received} · {c.restocked}:{" "}
                        {l.resellable}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
          <Stack sx={{ bgcolor: "background.paper", p: 2 }} spacing={0.75}>
            {[
              [
                c.subtotal,
                order && order.status !== "draft"
                  ? order.subtotalCents
                  : subtotal,
              ],
              [
                c.shipping,
                order && order.status !== "draft"
                  ? order.shippingCents
                  : shipping,
              ],
              [
                c.total,
                order && order.status !== "draft"
                  ? order.totalCents
                  : subtotal + shipping,
              ],
            ].map(([label, value]) => (
              <Stack
                key={label}
                direction="row"
                justifyContent="space-between"
                gap={2}
              >
                <Typography fontWeight={label === c.total ? 700 : 400}>
                  {label}
                </Typography>
                <Typography
                  fontWeight={label === c.total ? 700 : 400}
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {orderMoney(typeof value === "number" ? value : 0)}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1}
            flexWrap="wrap"
          >
            {(!order || order.status === "draft") && (
              <Button variant="contained" disabled={disabled} onClick={save}>
                {c.save}
              </Button>
            )}
            {order?.status === "draft" && (
              <Button
                disabled={disabled || dirty}
                onClick={() => setAction("confirm")}
              >
                {c.confirm}
              </Button>
            )}
            {order && (
              <Button
                disabled={disabled || dirty}
                onClick={() =>
                  setAction(order.payment === "paid" ? "pending" : "paid")
                }
              >
                {order.payment === "paid" ? c.markPending : c.markPaid}
              </Button>
            )}
            {order && nextOrderFulfillment(order) && (
              <Button
                disabled={disabled}
                onClick={() => setAction("fulfillment")}
              >
                {c.fulfillmentAction}:{" "}
                {
                  c.fulfillments[
                    nextOrderFulfillment(order) ?? order.fulfillment
                  ]
                }
              </Button>
            )}
            {order && canCancelOrder(order) && (
              <Button
                color="error"
                disabled={disabled || dirty}
                onClick={() => setAction("cancel")}
              >
                {c.cancel}
              </Button>
            )}
            {order && canReturnOrder(order) && (
              <Button disabled={disabled} onClick={() => setAction("return")}>
                {c.return}
              </Button>
            )}
          </Stack>
          {order?.status === "cancelled" && order.payment === "paid" && (
            <Alert severity="warning">{c.refundWarning}</Alert>
          )}
          {dirty && (
            <Typography variant="caption" color="text.secondary">
              {c.unsaved}
            </Typography>
          )}
          {order && <OrderHistory dictionary={dictionary} order={order} />}
        </>
      )}
      {order && action && (
        <OrderActionDialog
          key={action}
          dictionary={dictionary}
          order={order}
          action={action}
          busy={busy}
          onClose={() => setAction(null)}
          onApply={mutate}
        />
      )}
      <Dialog open={!!leave} onClose={busy ? undefined : () => setLeave(null)}>
        <DialogTitle>{c.unsaved}</DialogTitle>
        <DialogContent>{pending ? c.unknown : c.unsaved}</DialogContent>
        <DialogActions sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button onClick={() => setLeave(null)}>{c.stay}</Button>
          <Button
            disabled={busy || !!pending}
            color="error"
            onClick={() => {
              if (leave) {
                clearOrderPending(actorId, key);
                router.push(leave);
              }
            }}
          >
            {c.leave}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
