import type {
  CatalogFilters,
  StorefrontListingParams,
} from "../types/api_params";
import { normalizePage } from "./catalog_rules";

type Query = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";

function priceCents(value: string): number | undefined {
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(value)) return undefined;
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  return Number.isSafeInteger(cents) && cents <= 2147483647 ? cents : undefined;
}

export function parseCatalogQuery(query: Query): StorefrontListingParams {
  let minPriceCents = priceCents(first(query.min));
  let maxPriceCents = priceCents(first(query.max));
  if (
    minPriceCents !== undefined &&
    maxPriceCents !== undefined &&
    minPriceCents > maxPriceCents
  )
    [minPriceCents, maxPriceCents] = [maxPriceCents, minPriceCents];
  const sort = first(query.orden);
  return {
    page: normalizePage(query.page),
    q: first(query.q).trim().slice(0, 100),
    filterCategorySlug: first(query.categoria).slice(0, 180),
    minPriceCents,
    maxPriceCents,
    available: query.disponibles === "1",
    offers: query.ofertas === "1",
    sort:
      sort === "price_asc" ||
      sort === "price_desc" ||
      sort === "name_asc" ||
      sort === "name_desc"
        ? sort
        : "recommended",
  };
}

export function catalogFilters(
  params: StorefrontListingParams,
): CatalogFilters {
  return {
    q: params.q ?? "",
    category: params.filterCategorySlug ?? "",
    minPrice:
      params.minPriceCents === undefined
        ? ""
        : String(params.minPriceCents / 100),
    maxPrice:
      params.maxPriceCents === undefined
        ? ""
        : String(params.maxPriceCents / 100),
    available: params.available ?? false,
    offers: params.offers ?? false,
    sort: params.sort ?? "recommended",
  };
}

export function catalogQueryString(
  filters: CatalogFilters,
  page?: number,
): string {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("categoria", filters.category);
  if (filters.minPrice) query.set("min", filters.minPrice);
  if (filters.maxPrice) query.set("max", filters.maxPrice);
  if (filters.available) query.set("disponibles", "1");
  if (filters.offers) query.set("ofertas", "1");
  if (filters.sort !== "recommended") query.set("orden", filters.sort);
  if (page && page > 1) query.set("page", String(page));
  return query.toString();
}

export function activeCatalogFilters(filters: CatalogFilters): number {
  return (
    Number(Boolean(filters.q)) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.minPrice || filters.maxPrice)) +
    Number(filters.available) +
    Number(filters.offers)
  );
}
