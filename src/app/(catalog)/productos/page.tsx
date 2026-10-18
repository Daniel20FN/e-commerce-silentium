import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CatalogListing } from "@/domains/storefront/components/catalog_listing";
import { normalizePage } from "@/domains/storefront/services/catalog_rules";
import { getStorefrontListing } from "@/domains/storefront/services/catalog_service";
export const metadata = { title: getDictionary("es").storefront.catalogTitle };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const offers = params.ofertas === "1";
  const listing = await getStorefrontListing({
    page: normalizePage(params.page),
    offers,
  });
  return listing ? (
    <CatalogListing
      listing={listing}
      dictionary={getDictionary("es")}
      offers={offers}
    />
  ) : null;
}
