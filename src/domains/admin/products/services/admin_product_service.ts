import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  AdminProductsListParams,
  AdminProductUpsertParams,
} from "../types/api_params";
import type {
  AdminProductCategoryDto,
  AdminProductDetailDto,
  AdminProductListItemDto,
  AdminProductsListApiResponseData,
  AdminProductSortDirection,
  AdminProductSortField,
} from "../types/product_dto";
import {
  ADMIN_PRODUCT_SORT_DIRECTION,
  ADMIN_PRODUCT_SORT_FIELD,
} from "../types/product_dto";
import type {
  AdminProductErrorCode,
  AdminProductRuleError,
} from "../types/product_errors";
import { ADMIN_PRODUCT_ERROR } from "../types/product_errors";
import {
  assertProductCategories,
  assertProductSlugAvailable,
  buildArchiveState,
  getProductSellabilityWarning,
  isVariantSellable,
} from "./admin_product_rules";

export interface AdminProductMutationError {
  type: "validation_error" | "conflict" | "not_found" | "invalid_state";
  message: string;
}

interface ProductCategoryRecord {
  isPrimary: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductVariantSellabilityRecord {
  active?: boolean;
  isActive?: boolean;
  deletedAt: Date | null;
  stock: number;
}

interface ArchiveAdminProductOptions {
  now?: Date;
}

type ResolvedAdminProductsListParams = Required<
  Pick<
    AdminProductsListParams,
    | "page"
    | "pageSize"
    | "search"
    | "status"
    | "inTrash"
    | "sortField"
    | "sortDirection"
  >
> &
  Pick<
    AdminProductsListParams,
    "categoryId" | "brand" | "featured" | "stock" | "discounted"
  >;

function createMutationError(
  type: AdminProductMutationError["type"],
  message: string,
): AdminProductMutationError {
  return { type, message };
}

function isRuleError(error: unknown): error is AdminProductRuleError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as AdminProductRuleError).code === "string"
  );
}

function mapRuleError(error: unknown): never {
  if (isRuleError(error)) {
    const conflictCodes: AdminProductErrorCode[] = ["product_slug_conflict"];

    throw createMutationError(
      conflictCodes.includes(error.code) ? "conflict" : "validation_error",
      error.code,
    );
  }

  throw error;
}

function toProductCategoryDto(
  productCategory: ProductCategoryRecord,
): AdminProductCategoryDto {
  return {
    id: productCategory.category.id,
    name: productCategory.category.name,
    slug: productCategory.category.slug,
    isPrimary: productCategory.isPrimary,
  };
}

function getVariantActive(variant: ProductVariantSellabilityRecord): boolean {
  return variant.active ?? variant.isActive ?? false;
}

function toAdminProductListItem(
  product: ProductRecord,
): AdminProductListItemDto {
  const categories = product.categories.map(toProductCategoryDto);
  const sellableVariantCount = product.variants.filter((variant) =>
    isVariantSellable({
      active: getVariantActive(variant),
      deletedAt: variant.deletedAt,
      stock: variant.stock,
    }),
  ).length;
  const warning = getProductSellabilityWarning({
    status: product.status,
    variants: product.variants.map((variant) => ({
      active: getVariantActive(variant),
      deletedAt: variant.deletedAt,
      stock: variant.stock,
    })),
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    inTrash: product.deletedAt !== null,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    brand: product.brand,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featured: product.featured,
    primaryCategory: categories.find((category) => category.isPrimary) ?? null,
    categories,
    variantCount: product.variants.length,
    sellableVariantCount,
    hasSellableVariants: sellableVariantCount > 0,
    warnings: warning ? [warning] : [],
    archivedAt: product.archivedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function buildSearchWhere(
  search: string,
): Prisma.ProductWhereInput | undefined {
  const terms = search
    .trim()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return undefined;
  }

  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
        {
          variants: {
            some: {
              deletedAt: null,
              sku: { contains: term, mode: "insensitive" },
            },
          },
        },
      ],
    })),
  };
}

function buildOrderBy(
  sortField: AdminProductSortField,
  sortDirection: AdminProductSortDirection,
): Prisma.ProductOrderByWithRelationInput[] {
  const direction =
    sortDirection === ADMIN_PRODUCT_SORT_DIRECTION.asc ? "asc" : "desc";

  switch (sortField) {
    case ADMIN_PRODUCT_SORT_FIELD.name:
      return [{ name: direction }, { createdAt: "desc" }, { id: "asc" }];
    case ADMIN_PRODUCT_SORT_FIELD.status:
      return [{ status: direction }, { name: "asc" }, { id: "asc" }];
    case ADMIN_PRODUCT_SORT_FIELD.brand:
      return [{ brand: direction }, { name: "asc" }, { id: "asc" }];
    case ADMIN_PRODUCT_SORT_FIELD.createdAt:
      return [{ createdAt: direction }, { name: "asc" }, { id: "asc" }];
    case ADMIN_PRODUCT_SORT_FIELD.updatedAt:
    default:
      return [{ updatedAt: direction }, { name: "asc" }, { id: "asc" }];
  }
}

const productInclude = Prisma.validator<Prisma.ProductInclude>()({
  categories: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
  variants: {
    select: {
      isActive: true,
      deletedAt: true,
      stock: true,
    },
  },
});

type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const productDetailInclude = Prisma.validator<Prisma.ProductInclude>()({
  ...productInclude,
  options: {
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      values: {
        orderBy: [{ displayOrder: "asc" }, { value: "asc" }],
      },
    },
  },
});

type ProductDetailRecord = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

async function assertSlugAvailable(
  slug: string,
  productId?: string,
): Promise<void> {
  const existingProduct = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });

  try {
    assertProductSlugAvailable({
      slug,
      existingProductId: existingProduct?.id ?? null,
      currentProductId: productId,
    });
  } catch (error) {
    mapRuleError(error);
  }
}

async function loadActiveCategoryIds(categoryIds: string[]): Promise<string[]> {
  const categories = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  return categories.map((category) => category.id);
}

async function assertInputCategories(
  input: AdminProductUpsertParams,
): Promise<void> {
  const activeCategoryIds = await loadActiveCategoryIds(input.categoryIds);

  try {
    assertProductCategories({
      status: input.status,
      categoryIds: input.categoryIds,
      primaryCategoryId: input.primaryCategoryId,
      activeCategoryIds,
    });
  } catch (error) {
    mapRuleError(error);
  }
}

async function assertProductOptionsEditable(
  productId: string,
  input: AdminProductUpsertParams,
): Promise<void> {
  if (input.options === undefined) {
    return;
  }

  const variantCount = await prisma.productVariant.count({
    where: { productId },
  });

  if (variantCount > 0) {
    throw createMutationError(
      "validation_error",
      ADMIN_PRODUCT_ERROR.productOptionsLockedByVariants,
    );
  }
}

function buildProductData(
  input: AdminProductUpsertParams,
): Prisma.ProductCreateInput {
  return {
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription ?? null,
    longDescription: input.longDescription ?? null,
    brand: input.brand ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    featured: input.featured,
    status: input.status,
    categories: {
      create: input.categoryIds.map((categoryId) => ({
        category: { connect: { id: categoryId } },
        isPrimary: categoryId === input.primaryCategoryId,
      })),
    },
    ...(input.options
      ? {
          options: {
            create: input.options.map((option) => ({
              name: option.name,
              displayOrder: option.displayOrder,
              values: {
                create: option.values.map((value) => ({
                  value: value.value,
                  displayOrder: value.displayOrder,
                })),
              },
            })),
          },
        }
      : {}),
  };
}

function buildProductUpdateData(
  input: AdminProductUpsertParams,
): Prisma.ProductUpdateInput {
  return {
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription ?? null,
    longDescription: input.longDescription ?? null,
    brand: input.brand ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    featured: input.featured,
    status: input.status,
    categories: {
      deleteMany: {},
      create: input.categoryIds.map((categoryId) => ({
        category: { connect: { id: categoryId } },
        isPrimary: categoryId === input.primaryCategoryId,
      })),
    },
    ...(input.options
      ? {
          options: {
            deleteMany: {},
            create: input.options.map((option) => ({
              name: option.name,
              displayOrder: option.displayOrder,
              values: {
                create: option.values.map((value) => ({
                  value: value.value,
                  displayOrder: value.displayOrder,
                })),
              },
            })),
          },
        }
      : {}),
  };
}

export async function listAdminProducts(
  params: ResolvedAdminProductsListParams,
): Promise<AdminProductsListApiResponseData> {
  const where: Prisma.ProductWhereInput = {
    ...(params.inTrash ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(params.status !== "all" ? { status: params.status } : {}),
    ...(params.categoryId
      ? { categories: { some: { categoryId: params.categoryId } } }
      : {}),
    ...(params.brand
      ? { brand: { contains: params.brand, mode: "insensitive" } }
      : {}),
    ...(params.featured !== undefined ? { featured: params.featured } : {}),
    AND: [
      ...(params.search ? [buildSearchWhere(params.search) ?? {}] : []),
      ...(params.stock && params.stock !== "all"
        ? [
            {
              variants: {
                [params.stock === "in_stock" ? "some" : "none"]: {
                  deletedAt: null,
                  isActive: true,
                  stock: { gt: 0 },
                },
              },
            },
          ]
        : []),
      ...(params.discounted !== undefined
        ? [
            {
              variants: {
                [params.discounted ? "some" : "none"]: {
                  deletedAt: null,
                  isActive: true,
                  compareAtPriceCents: { not: null },
                },
              },
            },
          ]
        : []),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: buildOrderBy(params.sortField, params.sortDirection),
      skip: params.page * params.pageSize,
      take: params.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(toAdminProductListItem),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getAdminProductDetail(
  productId: string,
): Promise<AdminProductDetailDto> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productDetailInclude,
  });

  if (!product) {
    throw createMutationError("not_found", "record_not_found");
  }

  const detail = product as ProductDetailRecord;

  return {
    ...toAdminProductListItem(detail),
    optionsLocked: detail.variants.length > 0,
    options: detail.options.map((option) => ({
      id: option.id,
      name: option.name,
      displayOrder: option.displayOrder,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        displayOrder: value.displayOrder,
      })),
    })),
  };
}

export async function createAdminProduct(
  input: AdminProductUpsertParams,
): Promise<AdminProductListItemDto> {
  await assertSlugAvailable(input.slug);
  await assertInputCategories(input);

  const product = await prisma.product.create({
    data: buildProductData(input),
    include: productInclude,
  });

  return toAdminProductListItem(product);
}

export async function updateAdminProduct(
  productId: string,
  input: AdminProductUpsertParams,
): Promise<AdminProductListItemDto> {
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!currentProduct) {
    throw createMutationError("not_found", "record_not_found");
  }

  await assertSlugAvailable(input.slug, productId);
  await assertInputCategories(input);
  await assertProductOptionsEditable(productId, input);

  const product = await prisma.product.update({
    where: { id: productId },
    data: buildProductUpdateData(input),
    include: productInclude,
  });

  return toAdminProductListItem(product);
}

export async function trashAdminProduct(
  productId: string,
  options: ArchiveAdminProductOptions = {},
): Promise<AdminProductListItemDto> {
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!currentProduct) {
    throw createMutationError("not_found", "record_not_found");
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: options.now ?? new Date() },
    include: productInclude,
  });

  return toAdminProductListItem(product);
}

export async function restoreAdminProduct(
  productId: string,
): Promise<AdminProductListItemDto> {
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!currentProduct) {
    throw createMutationError("not_found", "record_not_found");
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: null },
    include: productInclude,
  });

  return toAdminProductListItem(product);
}

export async function archiveAdminProduct(
  productId: string,
  options: ArchiveAdminProductOptions = {},
): Promise<AdminProductListItemDto> {
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!currentProduct) {
    throw createMutationError("not_found", "record_not_found");
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: buildArchiveState(options.now ?? new Date()),
    include: productInclude,
  });

  return toAdminProductListItem(product);
}
