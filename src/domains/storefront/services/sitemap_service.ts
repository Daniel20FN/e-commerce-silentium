import { LEGAL_SLUGS } from "@/domains/legal/services/legal_release";
import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";
import "server-only";
import { visibleCategories } from "./catalog_rules";
import { publicProductWhere } from "./catalog_service";
import { storefrontUrl } from "./seo_rules";

export async function buildPublicSitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = visibleCategories(
    await prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        parentId: true,
        isActive: true,
        deletedAt: true,
      },
      orderBy: { id: "asc" },
    }),
  );
  const paths = [
    "/",
    "/productos",
    "/categorias",
    ...LEGAL_SLUGS.map((slug) => `/legal/${slug}`),
    ...categories.map((item) => `/categorias/${encodeURIComponent(item.slug)}`),
  ];
  const remaining = 50000 - paths.length;
  if (remaining < 0) throw new Error("sitemap_requires_partitioning");
  const products = await prisma.product.findMany({
    where: publicProductWhere(categories),
    select: { slug: true },
    orderBy: { id: "asc" },
    take: remaining + 1,
  });
  if (products.length > remaining)
    throw new Error("sitemap_requires_partitioning");
  return [
    ...paths,
    ...products.map((item) => `/productos/${encodeURIComponent(item.slug)}`),
  ].map((path) => ({ url: storefrontUrl(path) }));
}
