import { cache } from "react";
import type { StorefrontListing } from "../types/catalog";
import {
  catalogFilters,
  catalogQueryString,
  parseCatalogQuery,
} from "./catalog_filters";
import { getStorefrontListing } from "./catalog_service";
import type { CatalogSearch } from "./seo_rules";

const readListing = cache((category: string, query: string) =>
  getStorefrontListing({
    ...parseCatalogQuery(Object.fromEntries(new URLSearchParams(query))),
    ...(category ? { categorySlug: category } : {}),
  }),
);

export function getCatalogPageData(
  query: CatalogSearch,
  category = "",
): Promise<StorefrontListing | null> {
  const params = parseCatalogQuery(query);
  return readListing(
    category,
    catalogQueryString(catalogFilters(params), params.page),
  );
}
