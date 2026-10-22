export type CatalogSort =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc";

export interface CatalogFilters {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  available: boolean;
  offers: boolean;
  sort: CatalogSort;
}

export interface StorefrontListingParams {
  page?: number;
  categorySlug?: string;
  filterCategorySlug?: string;
  featured?: boolean;
  offers?: boolean;
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  available?: boolean;
  sort?: CatalogSort;
}
