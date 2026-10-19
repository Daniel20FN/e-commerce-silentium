import type { ApiResponse } from "@/types/api-service/api_response";

export interface CatalogCostInput {
  variantId: string | null;
  name: string;
  description: string | null;
  amountCents: number;
}
export interface CatalogCostUpdate extends CatalogCostInput {
  id: string;
  revision: string;
}
export interface CatalogCostLifecycle {
  id: string;
  revision: string;
  action: "trash" | "restore";
}
export interface CatalogCostDto extends CatalogCostInput {
  id: string;
  deletedAt: string | null;
  revision: string;
}
export interface CostVariantDto {
  id: string;
  sku: string;
  label: string;
  priceCents: number;
  active: boolean;
  inTrash: boolean;
}
export interface CostSummary {
  generalCents: number;
  specificCents: number;
  totalCents: number;
  marginCents: number;
  marginPercent: number | null;
  hasCosts: boolean;
}
export interface CatalogCostsData {
  items: CatalogCostDto[];
  variants: CostVariantDto[];
  summaries: Record<string, CostSummary>;
  writable: boolean;
}
export type CatalogCostsApiResponse = ApiResponse<CatalogCostsData>;
