import { listStorefrontCatalogImages } from "@/domains/admin/media/services/catalog_media_service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import "server-only";
import type { StorefrontListingParams } from "../types/api_params";
import type {
  StorefrontCategory,
  StorefrontImage,
  StorefrontListing,
  StorefrontProduct,
  StorefrontProductCard,
  StorefrontVariant,
} from "../types/catalog";
import { filteredCatalogPage } from "./catalog_filter_query";
import { catalogFilters } from "./catalog_filters";
import {
  categoryTrail,
  descendantCategoryIds,
  initialVariant,
  realCompareAtPrice,
  STOREFRONT_PAGE_SIZE,
  visibleCategories,
} from "./catalog_rules";

const imageSelect = {
  id: true,
  publicUrl: true,
  altText: true,
} satisfies Prisma.CatalogImageSelect;
const imageOrder = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.CatalogImageOrderByWithRelationInput[];
const images = {
  where: { status: "ready", deletedAt: null },
  orderBy: imageOrder,
  take: 10,
  select: imageSelect,
} satisfies Prisma.ProductVariant$imagesArgs;
export const storefrontProductSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  longDescription: true,
  brand: true,
  seoTitle: true,
  seoDescription: true,
  images: { ...images, where: { ...images.where, variantId: null } },
  categories: { select: { categoryId: true, isPrimary: true } },
  options: {
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      values: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        select: { id: true, value: true },
      },
    },
  },
  variants: {
    where: { isActive: true, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      sku: true,
      priceCents: true,
      compareAtPriceCents: true,
      stock: true,
      isDefault: true,
      optionValues: { select: { optionValueId: true } },
      images,
    },
  },
} satisfies Prisma.ProductSelect;
export type StorefrontProductRecord = Prisma.ProductGetPayload<{
  select: typeof storefrontProductSelect;
}>;
type ProductRecord = StorefrontProductRecord;
const cardSelect = {
  ...storefrontProductSelect,
  longDescription: false,
  seoTitle: false,
  seoDescription: false,
  options: false,
  images: { ...storefrontProductSelect.images, take: 1 },
  variants: {
    ...storefrontProductSelect.variants,
    select: {
      ...storefrontProductSelect.variants.select,
      images: { ...images, take: 1 },
    },
  },
} satisfies Prisma.ProductSelect;
type CardRecord = Pick<
  ProductRecord,
  "id" | "slug" | "name" | "shortDescription" | "brand" | "images" | "variants"
>;

function publicImage(
  image: { id: string; publicUrl: string; altText: string },
  name: string,
): StorefrontImage {
  return { id: image.id, url: image.publicUrl, alt: image.altText || name };
}

export const getStorefrontCategories = cache(
  async (): Promise<StorefrontCategory[]> => {
    const records = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
        deletedAt: true,
        seoTitle: true,
        seoDescription: true,
      },
    });
    return visibleCategories(records).map(
      ({
        id,
        slug,
        name,
        description,
        imageUrl,
        parentId,
        sortOrder,
        seoTitle,
        seoDescription,
      }) => ({
        id,
        slug,
        name,
        description,
        imageUrl,
        parentId,
        sortOrder,
        seoTitle,
        seoDescription,
      }),
    );
  },
);

function publicVariants(product: CardRecord): StorefrontVariant[] {
  return product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    priceCents: variant.priceCents,
    compareAtPriceCents: realCompareAtPrice(
      variant.priceCents,
      variant.compareAtPriceCents,
    ),
    stock: variant.stock,
    isDefault: variant.isDefault,
    optionValueIds: variant.optionValues.map((value) => value.optionValueId),
    images: variant.images.map((image) => publicImage(image, product.name)),
  }));
}

function productCard(product: CardRecord): StorefrontProductCard | null {
  const variants = publicVariants(product);
  const selected = initialVariant(variants);
  if (!selected) return null;
  const available = variants.filter((variant) => variant.stock > 0);
  const pricedVariants = available.length ? available : variants;
  const priceCents = Math.min(
    ...pricedVariants.map((variant) => variant.priceCents),
  );
  const reference = pricedVariants.find(
    (variant) => variant.priceCents === priceCents,
  );
  const hasMultiplePrices =
    new Set(pricedVariants.map((variant) => variant.priceCents)).size > 1;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    brand: product.brand,
    image:
      selected.images[0] ??
      (product.images[0] ? publicImage(product.images[0], product.name) : null),
    priceCents,
    compareAtPriceCents:
      !hasMultiplePrices && reference ? reference.compareAtPriceCents : null,
    hasMultiplePrices,
    available: variants.some((variant) => variant.stock > 0),
  };
}

export function publicProductWhere(
  categories: Pick<StorefrontCategory, "id">[],
): Prisma.ProductWhereInput {
  return {
    status: "active",
    deletedAt: null,
    archivedAt: null,
    categories: {
      some: { categoryId: { in: categories.map((category) => category.id) } },
    },
    variants: { some: { isActive: true, deletedAt: null } },
  };
}

export async function getStorefrontListing(
  params: StorefrontListingParams = {},
): Promise<StorefrontListing | null> {
  const categories = await getStorefrontCategories();
  const category = params.categorySlug
    ? categories.find((item) => item.slug === params.categorySlug)
    : null;
  if (params.categorySlug && !category) return null;
  const scopeIds = category
    ? descendantCategoryIds(category.id, categories)
    : categories.map((item) => item.id);
  const selectedCategory = params.filterCategorySlug
    ? categories.find(
        (item) =>
          item.slug === params.filterCategorySlug && scopeIds.includes(item.id),
      )
    : null;
  const categoryIds = params.filterCategorySlug
    ? selectedCategory
      ? descendantCategoryIds(selectedCategory.id, categories)
      : []
    : scopeIds;
  const where: Prisma.ProductWhereInput = {
    ...publicProductWhere(categories),
    ...(category || params.filterCategorySlug
      ? {
          categories: {
            some: {
              categoryId: {
                in: categoryIds,
              },
            },
          },
        }
      : {}),
    ...(params.featured ? { featured: true } : {}),
    ...(params.offers
      ? {
          variants: {
            some: {
              isActive: true,
              deletedAt: null,
              compareAtPriceCents: {
                gt: prisma.productVariant.fields.priceCents,
              },
            },
          },
        }
      : {}),
  };
  const advanced = Boolean(
    params.q ||
      params.minPriceCents !== undefined ||
      params.maxPriceCents !== undefined ||
      params.available ||
      (params.sort && params.sort !== "recommended"),
  );
  const filtered = advanced
    ? await filteredCatalogPage(params, categoryIds)
    : null;
  const total = filtered?.total ?? (await prisma.product.count({ where }));
  const pageCount =
    filtered?.pageCount ?? Math.max(1, Math.ceil(total / STOREFRONT_PAGE_SIZE));
  const requestedPage = params.page ?? 1;
  const page =
    filtered?.page ??
    (Number.isSafeInteger(requestedPage)
      ? Math.max(1, Math.min(requestedPage, pageCount))
      : 1);
  const records =
    filtered && !filtered.ids.length
      ? []
      : await prisma.product.findMany({
          where: filtered ? { ...where, id: { in: filtered.ids } } : where,
          select: cardSelect,
          orderBy: [{ featured: "desc" }, { name: "asc" }, { id: "asc" }],
          skip: filtered ? 0 : (page - 1) * STOREFRONT_PAGE_SIZE,
          take: STOREFRONT_PAGE_SIZE,
        });
  if (filtered) {
    const order = new Map(filtered.ids.map((id, index) => [id, index]));
    records.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return {
    items: records.flatMap((record) => {
      const card = productCard(record);
      return card ? [card] : [];
    }),
    page,
    pageCount,
    total,
    filters: catalogFilters(params),
    filterCategories: categories
      .filter((item) => scopeIds.includes(item.id))
      .map(({ id, slug, name, parentId }) => ({ id, slug, name, parentId })),
    category: category ?? null,
    breadcrumbs: category ? categoryTrail(category, categories) : [],
    children: categories.filter(
      (item) => item.parentId === (category?.id ?? null),
    ),
  };
}

export function projectStorefrontProduct(
  product: StorefrontProductRecord,
  categories: StorefrontCategory[],
): StorefrontProduct {
  const card = productCard(product);
  const variants = publicVariants(product);
  const selected = initialVariant(variants);
  const relatedIds = new Set(
    product.categories.map((relation) => relation.categoryId),
  );
  const related = categories.filter((category) => relatedIds.has(category.id));
  const primaryId = product.categories.find(
    (relation) => relation.isPrimary,
  )?.categoryId;
  const primary =
    related.find((category) => category.id === primaryId) ?? related[0];
  const usedValues = new Set(
    variants.flatMap((variant) => variant.optionValueIds),
  );

  return {
    ...(card ?? {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      brand: product.brand,
      image: null,
      priceCents: 0,
      compareAtPriceCents: null,
      hasMultiplePrices: false,
      available: false,
    }),
    longDescription: product.longDescription,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    categories: related,
    breadcrumbs: primary ? categoryTrail(primary, categories) : [],
    options: product.options.map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values
        .filter((value) => usedValues.has(value.id))
        .map((value) => ({ id: value.id, value: value.value })),
    })),
    variants,
    images: product.images.map((image) => publicImage(image, product.name)),
    initialVariantId: selected?.id ?? "",
  };
}

export const getStorefrontProduct = cache(
  async (slug: string): Promise<StorefrontProduct | null> => {
    if (!slug || slug.length > 180) return null;
    const categories = await getStorefrontCategories();
    const product = await prisma.product.findFirst({
      where: { ...publicProductWhere(categories), slug },
      select: storefrontProductSelect,
    });
    if (!product) return null;
    const card = productCard(product);
    const variants = publicVariants(product);
    const selected = initialVariant(variants);
    if (!card || !selected) return null;
    const projected = projectStorefrontProduct(product, categories);
    const resolvedImages = await listStorefrontCatalogImages(
      product.id,
      selected.id,
    );
    return {
      ...projected,
      image: resolvedImages[0]
        ? publicImage(resolvedImages[0], product.name)
        : null,
    };
  },
);
