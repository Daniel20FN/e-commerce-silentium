import type { CatalogCostDto, CostSummary } from "../types/api_params";

export const MAX_COST_CENTS = 2147483647;

export function parseCostPesos(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents <= MAX_COST_CENTS ? cents : null;
}

export function summarizeCosts(
  items: Pick<CatalogCostDto, "variantId" | "amountCents" | "deletedAt">[],
  variantId: string,
  priceCents: number,
): CostSummary {
  const applicable = items.filter(
    (item) =>
      !item.deletedAt &&
      (item.variantId === null || item.variantId === variantId),
  );
  const generalCents = applicable
    .filter((item) => item.variantId === null)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const specificCents = applicable
    .filter((item) => item.variantId === variantId)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const totalCents = generalCents + specificCents;
  if (!Number.isSafeInteger(totalCents))
    throw new RangeError("cost_total_overflow");
  const marginCents = priceCents - totalCents;
  return {
    generalCents,
    specificCents,
    totalCents,
    marginCents,
    marginPercent:
      priceCents > 0
        ? Math.round((marginCents / priceCents) * 10000) / 100
        : null,
    hasCosts: applicable.length > 0,
  };
}
