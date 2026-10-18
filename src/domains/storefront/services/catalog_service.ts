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
const productSelect = {
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
type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
const cardSelect = {
  ...productSelect,
  longDescription: false,
  seoTitle: false,
  seoDescription: false,
  options: false,
  images: { ...productSelect.images, take: 1 },
  variants: {
    ...productSelect.variants,
    select: {
      ...productSelect.variants.select,
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

function publicProductWhere(
  categories: StorefrontCategory[],
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
  const where: Prisma.ProductWhereInput = {
    ...publicProductWhere(categories),
    ...(category
      ? {
          categories: {
            some: {
              categoryId: {
                in: descendantCategoryIds(category.id, categories),
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
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / STOREFRONT_PAGE_SIZE));
  const requestedPage = params.page ?? 1;
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, pageCount))
    : 1;
  const records = await prisma.product.findMany({
    where,
    select: cardSelect,
    orderBy: [{ featured: "desc" }, { name: "asc" }, { id: "asc" }],
    skip: (page - 1) * STOREFRONT_PAGE_SIZE,
    take: STOREFRONT_PAGE_SIZE,
  });
  return {
    items: records.flatMap((record) => {
      const card = productCard(record);
      return card ? [card] : [];
    }),
    page,
    pageCount,
    total,
    category: category ?? null,
    breadcrumbs: category ? categoryTrail(category, categories) : [],
    children: categories.filter(
      (item) => item.parentId === (category?.id ?? null),
    ),
  };
}

export const getStorefrontProduct = cache(
  async (slug: string): Promise<StorefrontProduct | null> => {
    if (!slug || slug.length > 180) return null;
    const categories = await getStorefrontCategories();
    const product = await prisma.product.findFirst({
      where: { ...publicProductWhere(categories), slug },
      select: productSelect,
    });
    if (!product) return null;
    const card = productCard(product);
    const variants = publicVariants(product);
    const selected = initialVariant(variants);
    if (!card || !selected) return null;
    const relatedIds = new Set(
      product.categories.map((relation) => relation.categoryId),
    );
    const related = categories.filter((category) =>
      relatedIds.has(category.id),
    );
    const primaryId = product.categories.find(
      (relation) => relation.isPrimary,
    )?.categoryId;
    const primary =
      related.find((category) => category.id === primaryId) ?? related[0];
    const usedValues = new Set(
      variants.flatMap((variant) => variant.optionValueIds),
    );
    const resolvedImages = await listStorefrontCatalogImages(
      product.id,
      selected.id,
    );

    return {
      ...card,
      image: resolvedImages[0]
        ? publicImage(resolvedImages[0], product.name)
        : null,
      longDescription: product.longDescription,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      categories: related,
      breadcrumbs: primary ? categoryTrail(primary, categories) : [],
      options: product.options.map((option) => ({
        ...option,
        values: option.values.filter((value) => usedValues.has(value.id)),
      })),
      variants,
      images: product.images.map((image) => publicImage(image, product.name)),
      initialVariantId: selected.id,
    };
  },
);
