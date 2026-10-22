"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Box, Stack, Typography } from "@mui/material";
import type { OrderDetailDto } from "../types/api_params";
import { orderDate } from "./order_format";
export function OrderHistory({
  dictionary,
  order,
}: {
  dictionary: Dictionary;
  order: OrderDetailDto;
}) {
  const c = dictionary.admin.orders;
  function state(value: string | null): string {
    if (!value) return "";
    if (value === "draft" || value === "confirmed" || value === "cancelled")
      return c.statuses[value];
    if (value === "paid") return c.payments.paid;
    if (value === "pending") return c.payments.pending;
    if (
      value === "preparing" ||
      value === "shipped" ||
      value === "ready" ||
      value === "delivered"
    )
      return c.fulfillments[value];
    return value;
  }
  return (
    <Stack component="section" spacing={1.5}>
      <Typography component="h2" variant="h6">
        {c.history}
      </Typography>
      {order.events.length === 0 && <Typography>{c.noHistory}</Typography>}
      {order.events.map((event) => (
        <Box
          key={event.id}
          sx={{
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            overflowWrap: "anywhere",
          }}
        >
          <Typography fontWeight={600} variant="body2">
            {c.events[event.kind]}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {event.actorLabel} · {orderDate(event.createdAt)}
          </Typography>
          {(event.from || event.to) && (
            <Typography variant="body2">
              {state(event.from)} → {state(event.to)}
            </Typography>
          )}
          {event.reason && (
            <Typography variant="body2">{event.reason}</Typography>
          )}
          {event.returns.map((row) => (
            <Typography key={row.lineId} variant="body2">
              {order.lines.find((l) => l.id === row.lineId)?.sku} · {c.received}
              : {row.received} · {c.resellable}: {row.resellable}
            </Typography>
          ))}
        </Box>
      ))}
    </Stack>
  );
}
