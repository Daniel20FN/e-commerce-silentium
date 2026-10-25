import { searchIndexingEnabled } from "@/domains/storefront/services/seo_rules";
import { buildPublicSitemap } from "@/domains/storefront/services/sitemap_service";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
const readSitemap = unstable_cache(buildPublicSitemap, ["public-sitemap-v1"], {
  revalidate: 300,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return searchIndexingEnabled() ? readSitemap() : [];
}
