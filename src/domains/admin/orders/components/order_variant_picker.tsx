"use client";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type {
  OrderVariantDto,
  OrderVariantQueryParams,
  OrderVariantsApiResponse,
  OrderVariantsData,
} from "../types/api_params";
import { orderMoney } from "./order_format";
export function OrderVariantPicker({
  dictionary,
  disabled,
  selectedIds,
  onAdd,
  onRefreshPrice,
}: {
  dictionary: Dictionary;
  disabled: boolean;
  selectedIds: string[];
  onAdd: (variant: OrderVariantDto) => void;
  onRefreshPrice: (variant: OrderVariantDto) => void;
}) {
  const c = dictionary.admin.orders;
  const [search, setSearch] = useState("");
  const [data, setData] = useState<OrderVariantsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const serial = useRef(0);
  async function load(cursor?: string) {
    const id = ++serial.current;
    setBusy(true);
    setError(false);
    try {
      const result = await apiService.get<
        OrderVariantsApiResponse,
        OrderVariantQueryParams
      >("/admin/orders/variants", {
        search: search.trim() || undefined,
        cursor,
      });
      if (!result) throw Error();
      if (id === serial.current)
        setData((old) => ({
          ...result,
          variants:
            cursor && old
              ? [
                  ...old.variants,
                  ...result.variants.filter(
                    (v) => !old.variants.some((o) => o.id === v.id),
                  ),
                ]
              : result.variants,
        }));
    } catch {
      if (id === serial.current) setError(true);
    } finally {
      if (id === serial.current) setBusy(false);
    }
  }
  useEffect(
    () => () => {
      serial.current++;
    },
    [],
  );
  return (
    <Stack spacing={1.5}>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
      >
        <TextField
          size="small"
          sx={{ flexGrow: 1, minWidth: 0 }}
          label={c.variantSearch}
          value={search}
          disabled={disabled}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ maxLength: 120 }}
        />
        <Button type="submit" disabled={disabled || busy}>
          {c.searchAction}
        </Button>
      </Box>
      {busy && !data && <Skeleton height={80} />}
      {error && <Alert severity="error">{c.error}</Alert>}
      {data?.variants.length === 0 && (
        <Typography variant="body2">{c.noVariants}</Typography>
      )}
      {data?.variants.map((v) => (
        <Box
          key={v.id}
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexWrap: "wrap",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Avatar
            variant="rounded"
            src={v.imageUrl ?? undefined}
            alt={v.productName}
            sx={{ width: 48, height: 48 }}
          >
            {v.productName.slice(0, 1)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 100, overflowWrap: "anywhere" }}>
            <Typography variant="body2" fontWeight={600}>
              {v.productName}
            </Typography>
            <Typography variant="caption" display="block">
              {v.sku} · {v.attributes}
            </Typography>
            <Typography variant="caption">
              {orderMoney(v.priceCents)} · {c.stock}: {v.stock}
            </Typography>
          </Box>
          <Button
            disabled={
              disabled ||
              (!selectedIds.includes(v.id) && selectedIds.length >= 25)
            }
            onClick={() =>
              selectedIds.includes(v.id) ? onRefreshPrice(v) : onAdd(v)
            }
          >
            {selectedIds.includes(v.id) ? c.updatePrice : c.add}
          </Button>
        </Box>
      ))}
      {selectedIds.length >= 25 && (
        <Typography variant="caption">{c.lineLimit}</Typography>
      )}
      {data?.nextCursor && (
        <Button
          disabled={disabled || busy}
          onClick={() => void load(data.nextCursor ?? undefined)}
        >
          {c.more}
        </Button>
      )}
    </Stack>
  );
}
