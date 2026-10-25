import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CatalogListing } from "@/domains/storefront/components/catalog_listing";
import { getCatalogPageData } from "@/domains/storefront/services/catalog_page_data";
import { listingMetadata } from "@/domains/storefront/services/seo_rules";
import { getCatalogDictionary } from "@/domains/storefront/services/storefront_dictionary";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const listing = await getCatalogPageData(query, slug);
  const category = listing?.category;
  return listing && category
    ? {
        ...listingMetadata(
          `/categorias/${encodeURIComponent(category.slug)}`,
          query,
          listing.page,
        ),
        title: category.seoTitle ?? category.name,
        description:
          category.seoDescription ?? category.description ?? undefined,
      }
    : {
        title: getDictionary("es").storefront.notFoundTitle,
        robots: { index: false, follow: false },
      };
}
export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const listing = await getCatalogPageData(query, slug);
  if (!listing) notFound();
  return (
    <CatalogListing
      listing={listing}
      dictionary={getCatalogDictionary(getDictionary("es"))}
    />
  );
}
