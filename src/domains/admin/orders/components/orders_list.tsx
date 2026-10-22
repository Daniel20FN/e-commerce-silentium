"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { apiService } from "@/types/api-service/api_service";
import { Add, Refresh } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OrdersApiResponse,
  OrdersData,
  OrdersQueryParams,
} from "../types/api_params";
import { orderDate, orderMoney } from "./order_format";
export function OrdersList({ dictionary }: { dictionary: Dictionary }) {
  const c = dictionary.admin.orders;
  const [data, setData] = useState<OrdersData | null>(null);
  const [query, setQuery] = useState<OrdersQueryParams>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const serial = useRef(0);
  async function load(next: OrdersQueryParams, append = false) {
    const version = ++serial.current;
    setBusy(true);
    setError(false);
    try {
      const result = await apiService.get<OrdersApiResponse, OrdersQueryParams>(
        "/admin/orders",
        next,
      );
      if (!result) throw Error();
      if (version !== serial.current) return;
      setData((old) => ({
        ...result,
        orders:
          append && old
            ? [
                ...old.orders,
                ...result.orders.filter(
                  (r) => !old.orders.some((o) => o.id === r.id),
                ),
              ]
            : result.orders,
      }));
      setQuery(next);
    } catch {
      if (version === serial.current) setError(true);
    } finally {
      if (version === serial.current) setBusy(false);
    }
  }
  const invalidateRequests = useCallback(() => {
    serial.current++;
  }, []);
  useEffect(() => {
    void load({});
    return invalidateRequests;
  }, [invalidateRequests]);
  const filter = (next: OrdersQueryParams) =>
    void load({ ...query, ...next, cursor: undefined });
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
      >
        <Button
          component={Link}
          href="/admin/pedidos/nuevo"
          variant="contained"
          startIcon={<Add />}
        >
          {c.new}
        </Button>
        <Button
          startIcon={<Refresh />}
          disabled={busy}
          onClick={() => void load({ ...query, cursor: undefined })}
        >
          {c.refresh}
        </Button>
      </Stack>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          filter({ search: search.trim() || undefined });
        }}
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(180px, 2fr) repeat(3, minmax(130px, 1fr)) auto",
          },
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          label={c.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ maxLength: 120 }}
        />
        <TextField
          size="small"
          select
          label={c.status}
          value={query.status ?? ""}
          onChange={(e) =>
            filter({
              status:
                e.target.value === "draft" ||
                e.target.value === "confirmed" ||
                e.target.value === "cancelled"
                  ? e.target.value
                  : undefined,
            })
          }
        >
          <MenuItem value="">{c.all}</MenuItem>
          {Object.entries(c.statuses).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label={c.payment}
          value={query.payment ?? ""}
          onChange={(e) =>
            filter({
              payment:
                e.target.value === "paid" || e.target.value === "pending"
                  ? e.target.value
                  : undefined,
            })
          }
        >
          <MenuItem value="">{c.all}</MenuItem>
          {Object.entries(c.payments).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label={c.fulfillment}
          value={query.fulfillment ?? ""}
          onChange={(e) =>
            filter({
              fulfillment: [
                "pending",
                "preparing",
                "shipped",
                "ready",
                "delivered",
              ].includes(e.target.value)
                ? e.target.value === "preparing"
                  ? "preparing"
                  : e.target.value === "shipped"
                    ? "shipped"
                    : e.target.value === "ready"
                      ? "ready"
                      : e.target.value === "delivered"
                        ? "delivered"
                        : "pending"
                : undefined,
            })
          }
        >
          <MenuItem value="">{c.all}</MenuItem>
          {Object.entries(c.fulfillments).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" disabled={busy}>
          {c.searchAction}
        </Button>
      </Box>
      {error && <Alert severity="error">{c.error}</Alert>}
      {busy && !data && (
        <Stack aria-label={c.loading}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height={100} />
          ))}
        </Stack>
      )}
      {data?.orders.length === 0 && <Alert severity="info">{c.empty}</Alert>}
      <Stack spacing={0}>
        {data?.orders.map((order) => (
          <Box
            key={order.id}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(180px, 2fr) 2fr 1fr auto",
              },
              gap: 1.5,
              py: 2,
              borderBottom: 1,
              borderColor: "divider",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700}>
                {c.number} #{order.number}
              </Typography>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {order.customerName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {orderDate(order.createdAt)}
              </Typography>
            </Box>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={c.statuses[order.status]}
              />
              <Chip
                size="small"
                variant="outlined"
                color={order.payment === "paid" ? "success" : "default"}
                label={`${c.payment}: ${c.payments[order.payment]}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={c.fulfillments[order.fulfillment]}
              />
            </Stack>
            <Typography
              sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
            >
              {orderMoney(order.totalCents)}
            </Typography>
            <Button component={Link} href={`/admin/pedidos/${order.id}`}>
              {c.open}
            </Button>
          </Box>
        ))}
      </Stack>
      {data?.nextCursor && (
        <Button
          disabled={busy}
          onClick={() =>
            void load({ ...query, cursor: data.nextCursor ?? undefined }, true)
          }
        >
          {c.more}
        </Button>
      )}
    </Stack>
  );
}
