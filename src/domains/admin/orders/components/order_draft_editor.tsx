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
import type { OrderForm } from "./order_form";
import { variantToLine } from "./order_form";
import { orderMoney, parsePrice, parseQuantity } from "./order_format";
import { OrderVariantPicker } from "./order_variant_picker";
export function OrderDraftEditor({
  dictionary,
  form,
  disabled,
  onChange,
}: {
  dictionary: Dictionary;
  form: OrderForm;
  disabled: boolean;
  onChange: (form: OrderForm) => void;
}) {
  const c = dictionary.admin.orders;
  const field = (
    key: "customerName" | "customerPhone" | "address" | "shipping" | "notes",
    label: string,
    max: number,
  ) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={form[key]}
      disabled={disabled}
      onChange={(e) => onChange({ ...form, [key]: e.target.value })}
      inputProps={{
        maxLength: max,
        ...(key === "shipping" ? { inputMode: "decimal" } : {}),
      }}
      multiline={key === "notes" || key === "address"}
      minRows={key === "notes" ? 2 : undefined}
    />
  );
  return (
    <Stack spacing={3}>
      <Stack spacing={1.5} component="section">
        <Typography variant="h6" component="h2">
          {c.customer}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {c.privateHint}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {field("customerName", c.customerName, 120)}
          {field("customerPhone", c.customerPhone, 26)}
          <TextField
            select
            size="small"
            label={c.delivery}
            value={form.delivery}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...form,
                delivery: e.target.value === "shipping" ? "shipping" : "pickup",
                address: e.target.value === "pickup" ? "" : form.address,
                shipping: e.target.value === "pickup" ? "0" : form.shipping,
              })
            }
          >
            {Object.entries(c.deliveries).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          {form.delivery === "shipping" && field("shipping", c.shipping, 14)}
        </Box>
        {form.delivery === "shipping" && field("address", c.address, 500)}
        {field("notes", c.notes, 1000)}
      </Stack>
      <Stack spacing={1.5} component="section">
        <Typography variant="h6" component="h2">
          {c.lines}
        </Typography>
        <Alert severity="info">{c.draftHint}</Alert>
        <OrderVariantPicker
          dictionary={dictionary}
          disabled={disabled}
          selectedIds={form.lines.map((l) => l.variantId)}
          onAdd={(v) =>
            onChange({ ...form, lines: [...form.lines, variantToLine(v)] })
          }
          onRefreshPrice={(v) =>
            onChange({
              ...form,
              lines: form.lines.map((l) =>
                l.variantId === v.id
                  ? {
                      ...l,
                      productName: v.productName,
                      sku: v.sku,
                      attributes: v.attributes,
                      catalogPriceCents: v.priceCents,
                    }
                  : l,
              ),
            })
          }
        />
        {form.lines.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {c.emptyLines}
          </Typography>
        )}
        {form.lines.map((line, index) => (
          <Stack
            key={line.variantId}
            spacing={1.5}
            sx={{ py: 2, borderBottom: 1, borderColor: "divider", minWidth: 0 }}
          >
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <Typography fontWeight={600}>{line.productName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {line.sku} · {line.attributes}
                </Typography>
              </Box>
              <Button
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...form,
                    lines: form.lines.filter(
                      (l) => l.variantId !== line.variantId,
                    ),
                  })
                }
              >
                {c.remove}
              </Button>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "120px 1fr 1fr" },
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                label={`${c.quantity} · ${line.sku || index + 1}`}
                value={line.quantity}
                disabled={disabled}
                inputProps={{ inputMode: "numeric", maxLength: 9 }}
                onChange={(e) =>
                  onChange({
                    ...form,
                    lines: form.lines.map((l, i) =>
                      i === index ? { ...l, quantity: e.target.value } : l,
                    ),
                  })
                }
              />
              <TextField
                size="small"
                label={`${c.unitPrice} · ${line.sku || index + 1}`}
                value={line.unitPrice}
                disabled={disabled}
                inputProps={{ inputMode: "decimal", maxLength: 14 }}
                onChange={(e) =>
                  onChange({
                    ...form,
                    lines: form.lines.map((l, i) =>
                      i === index ? { ...l, unitPrice: e.target.value } : l,
                    ),
                  })
                }
              />
              <Typography
                alignSelf="center"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {orderMoney(
                  (parseQuantity(line.quantity) ?? 0) *
                    (parsePrice(line.unitPrice) ?? 0),
                )}
              </Typography>
            </Box>
            <Typography variant="caption">
              {c.catalogPrice}: {orderMoney(line.catalogPriceCents)}
            </Typography>
            {parsePrice(line.unitPrice) !== line.catalogPriceCents && (
              <TextField
                size="small"
                required
                label={c.priceReason}
                value={line.priceReason}
                disabled={disabled}
                inputProps={{ maxLength: 500 }}
                onChange={(e) =>
                  onChange({
                    ...form,
                    lines: form.lines.map((l, i) =>
                      i === index ? { ...l, priceReason: e.target.value } : l,
                    ),
                  })
                }
              />
            )}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
