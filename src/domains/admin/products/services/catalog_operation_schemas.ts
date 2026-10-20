import { z } from "zod";

export const PRICE_BATCH_LIMIT = 50;
const cents = z.number().int().min(0).max(999999999);

export const duplicateProductSchema = z.strictObject({
  operationId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime(),
  copyCosts: z.boolean(),
});

export const priceBatchSchema = z.strictObject({
  expectedProductUpdatedAt: z.iso.datetime(),
  rows: z
    .array(
      z
        .strictObject({
          variantId: z.string().min(1).max(191),
          expectedUpdatedAt: z.iso.datetime(),
          priceCents: cents,
          compareAtPriceCents: cents.nullable(),
        })
        .refine(
          (row) =>
            row.compareAtPriceCents === null ||
            row.compareAtPriceCents > row.priceCents,
          { error: "compare_at_price_invalid" },
        ),
    )
    .min(1)
    .max(PRICE_BATCH_LIMIT)
    .refine(
      (rows) => new Set(rows.map((row) => row.variantId)).size === rows.length,
      { error: "operation_duplicate_rows" },
    ),
});

export function parsePricePesos(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return result <= 999999999 ? result : null;
}

export function pricePesosInput(centsValue: number): string {
  return `${Math.floor(centsValue / 100)}.${String(centsValue % 100).padStart(2, "0")}`;
}
