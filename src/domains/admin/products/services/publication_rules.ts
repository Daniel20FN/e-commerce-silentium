import type { AdminProductUpsertParams } from "../types/api_params";
import type { AdminProductDetailDto } from "../types/product_dto";
import type { PublicationIssue, PublicationReport } from "../types/publication";

export function publicationIssues(
  input: Omit<PublicationReport, "issues"> & {
    hasImages: boolean;
    hasSeo: boolean;
    hasCosts: boolean;
  },
): PublicationIssue[] {
  const issues: PublicationIssue[] = [];
  if (input.readOnly)
    issues.push({
      code: "read_only",
      level: "blocker",
      section: "information",
    });
  else if (input.status !== "active")
    issues.push({
      code: "not_active",
      level: "blocker",
      section: "information",
    });
  if (!input.categories.some((category) => category.visible))
    issues.push({
      code: "no_visible_categories",
      level: "blocker",
      section: "information",
    });
  else if (input.categories.some((category) => !category.visible))
    issues.push({
      code: "hidden_categories",
      level: "warning",
      section: "information",
    });
  const active = input.variants.filter(
    (variant) => variant.active && !variant.inTrash,
  );
  if (!active.length)
    issues.push({
      code: "no_active_variants",
      level: "blocker",
      section: "variants",
    });
  else if (!active.some((variant) => variant.stock > 0))
    issues.push({ code: "no_stock", level: "warning", section: "variants" });
  if (
    input.variants.some(
      (variant) =>
        variant.isDefault &&
        (!variant.active || variant.inTrash || variant.stock === 0),
    )
  )
    issues.push({
      code: "default_unavailable",
      level: "warning",
      section: "variants",
    });
  if (!input.hasImages)
    issues.push({
      code: "missing_images",
      level: "recommendation",
      section: "media",
    });
  if (!input.hasSeo)
    issues.push({
      code: "missing_seo",
      level: "recommendation",
      section: "information",
    });
  if (!input.hasCosts)
    issues.push({
      code: "missing_costs",
      level: "recommendation",
      section: "costs",
    });
  return issues;
}

export function publicationPayload(
  product: AdminProductDetailDto,
): AdminProductUpsertParams {
  return {
    expectedUpdatedAt: product.updatedAt,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    brand: product.brand,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featured: product.featured,
    status: "active",
    categoryIds: product.categories.map((category) => category.id),
    primaryCategoryId: product.primaryCategory?.id ?? "",
  };
}
