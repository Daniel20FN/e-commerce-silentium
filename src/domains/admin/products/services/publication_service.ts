import "server-only";

import {
  getStorefrontCategories,
  projectStorefrontProduct,
  publicProductWhere,
  storefrontProductSelect,
} from "@/domains/storefront/services/catalog_service";
import type { StorefrontProduct } from "@/domains/storefront/types/catalog";
import { prisma } from "@/lib/prisma";
import type { PublicationReport } from "../types/publication";
import { publicationIssues } from "./publication_rules";

export async function getProductPublication(
  productId: string,
): Promise<PublicationReport | null> {
  const [categories, record] = await Promise.all([
    getStorefrontCategories(),
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        ...storefrontProductSelect,
        status: true,
        deletedAt: true,
        archivedAt: true,
        updatedAt: true,
        categories: {
          select: {
            categoryId: true,
            isPrimary: true,
            category: {
              select: { id: true, name: true, isActive: true, deletedAt: true },
            },
          },
        },
        variants: {
          ...storefrontProductSelect.variants,
          where: {},
          select: {
            ...storefrontProductSelect.variants.select,
            isActive: true,
            deletedAt: true,
          },
        },
        _count: { select: { costs: { where: { deletedAt: null } } } },
      },
    }),
  ]);
  if (!record) return null;
  // Use the public SQL predicate itself, not a parallel publication policy.
  const publicRecord = await prisma.product.findFirst({
    where: { ...publicProductWhere(categories), id: productId },
    select: { id: true },
  });
  const active = record.variants.filter(
    (variant) => variant.isActive && !variant.deletedAt,
  );
  const preview = projectStorefrontProduct(
    { ...record, variants: active },
    categories,
  );
  const readyVariantCount = active.filter(
    (variant) => variant.stock > 0,
  ).length;
  const report: Omit<PublicationReport, "issues"> = {
    productId: record.id,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    readOnly:
      !!record.deletedAt || !!record.archivedAt || record.status === "archived",
    visible: publicRecord !== null,
    purchasable: publicRecord !== null && readyVariantCount > 0,
    publicUrl: publicRecord
      ? `/productos/${encodeURIComponent(record.slug)}`
      : null,
    readyVariantCount,
    selectedSku:
      preview.variants.find(
        (variant) => variant.id === preview.initialVariantId,
      )?.sku ?? null,
    categories: record.categories.map(({ category }) => ({
      id: category.id,
      name: category.name,
      active: category.isActive,
      inTrash: !!category.deletedAt,
      visible: categories.some((visible) => visible.id === category.id),
    })),
    variants: record.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      active: variant.isActive,
      inTrash: !!variant.deletedAt,
      stock: variant.stock,
      isDefault: variant.isDefault,
    })),
  };
  return {
    ...report,
    issues: publicationIssues({
      ...report,
      hasImages: !!(
        record.images.length || active.some((variant) => variant.images.length)
      ),
      hasSeo: !!(record.seoTitle?.trim() && record.seoDescription?.trim()),
      hasCosts: record._count.costs > 0,
    }),
  };
}

export async function getProductPreview(
  productId: string,
): Promise<StorefrontProduct | null> {
  if (!productId || productId.length > 191) return null;
  const [record, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: storefrontProductSelect,
    }),
    getStorefrontCategories(),
  ]);
  return record ? projectStorefrontProduct(record, categories) : null;
}
