import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CatalogListing } from "@/domains/storefront/components/catalog_listing";
import { normalizePage } from "@/domains/storefront/services/catalog_rules";
import {
  getStorefrontCategories,
  getStorefrontListing,
} from "@/domains/storefront/services/catalog_service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getStorefrontCategories()).find(
    (item) => item.slug === slug,
  );
  return category
    ? {
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
  const listing = await getStorefrontListing({
    categorySlug: slug,
    page: normalizePage(query.page),
  });
  if (!listing) notFound();
  return <CatalogListing listing={listing} dictionary={getDictionary("es")} />;
}
