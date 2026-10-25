import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CatalogListing } from "@/domains/storefront/components/catalog_listing";
import { getCatalogPageData } from "@/domains/storefront/services/catalog_page_data";
import {
  listingMetadata,
  type CatalogSearch,
} from "@/domains/storefront/services/seo_rules";
import { getCatalogDictionary } from "@/domains/storefront/services/storefront_dictionary";
import type { Metadata } from "next";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearch>;
}): Promise<Metadata> {
  const query = await searchParams;
  const listing = await getCatalogPageData(query);
  return {
    title: getDictionary("es").storefront.catalogTitle,
    ...listingMetadata("/productos", query, listing?.page ?? 1),
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const offers = params.ofertas === "1";
  const listing = await getCatalogPageData(params);
  return listing ? (
    <CatalogListing
      listing={listing}
      dictionary={getCatalogDictionary(getDictionary("es"))}
      offers={offers}
    />
  ) : null;
}
