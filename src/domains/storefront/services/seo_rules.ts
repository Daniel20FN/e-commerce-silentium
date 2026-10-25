import type { Metadata } from "next";
import {
  catalogFilters,
  catalogQueryString,
  parseCatalogQuery,
} from "./catalog_filters";

export const STOREFRONT_ORIGIN = "https://www.silentium-hogar.com";
export const NO_INDEX = { index: false, follow: false };
export type CatalogSearch = Record<string, string | string[] | undefined>;

export function searchIndexingEnabled(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function storefrontUrl(path: string): string {
  return `${STOREFRONT_ORIGIN}${path}`;
}

export function canonicalMetadata(path: string): Metadata {
  return {
    alternates: { canonical: storefrontUrl(path) },
    ...(!searchIndexingEnabled() ? { robots: NO_INDEX } : {}),
  };
}

export function listingMetadata(
  path: string,
  query: CatalogSearch,
  page: number,
): Metadata {
  const params = parseCatalogQuery(query);
  const filters = catalogFilters(params);
  const filtered = Boolean(
    filters.q ||
      filters.category ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.available ||
      filters.offers ||
      filters.sort !== "recommended",
  );
  const suffix = catalogQueryString(filters, page);
  return {
    ...canonicalMetadata(`${path}${suffix ? `?${suffix}` : ""}`),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    ...(!searchIndexingEnabled() ? { robots: NO_INDEX } : {}),
  };
}

export function seoPrivatePath(path: string): boolean {
  return [
    "/api",
    "/admin",
    "/account",
    "/carrito",
    "/checkout",
    "/login",
    "/register",
    "/auth",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
