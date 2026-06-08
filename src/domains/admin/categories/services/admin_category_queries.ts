import "server-only";

import type { AdminCategoriesListParams } from "@/domains/admin/categories/types/api_params";
import type {
  AdminCategoriesListApiResponseData,
  AdminCategoryListItemDto,
  AdminCategoryParentOptionsApiResponseData,
} from "@/domains/admin/categories/types/api_responses";
import {
  ADMIN_CATEGORY_HIERARCHY,
  ADMIN_CATEGORY_SORT_DIRECTION,
  ADMIN_CATEGORY_SORT_FIELD,
  ADMIN_CATEGORY_STATUS,
} from "@/domains/admin/categories/types/shared";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface CategoryListRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parent: {
    name: string;
  } | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryParentOptionRecord {
  id: string;
  name: string;
}

function toCategoryListItem(
  category: CategoryListRecord,
): AdminCategoryListItemDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    isActive: category.isActive,
    inTrash: category.deletedAt !== null,
    sortOrder: category.sortOrder,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    productsCount: null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toCategoryParentOption(
  category: CategoryParentOptionRecord,
): CategoryParentOptionRecord {
  return {
    id: category.id,
    name: category.name,
  };
}

function buildSearchWhere(
  search: string,
): Prisma.CategoryWhereInput | undefined {
  const normalizedSearch = search.trim();

  if (!normalizedSearch) {
    return undefined;
  }

  const terms = normalizedSearch
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return {
    AND: terms.map((term) => ({
      OR: [
        {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: term,
            mode: "insensitive",
          },
        },
      ],
    })),
  };
}

function buildOrderBy(
  sortField: NonNullable<AdminCategoriesListParams["sortField"]>,
  sortDirection: NonNullable<AdminCategoriesListParams["sortDirection"]>,
): Prisma.CategoryOrderByWithRelationInput[] {
  const direction =
    sortDirection === ADMIN_CATEGORY_SORT_DIRECTION.asc ? "asc" : "desc";

  switch (sortField) {
    case ADMIN_CATEGORY_SORT_FIELD.name:
      return [{ name: direction }, { createdAt: "desc" }];
    case ADMIN_CATEGORY_SORT_FIELD.createdAt:
      return [{ createdAt: direction }, { name: "asc" }];
    case ADMIN_CATEGORY_SORT_FIELD.updatedAt:
      return [{ updatedAt: direction }, { name: "asc" }];
    case ADMIN_CATEGORY_SORT_FIELD.sortOrder:
    default:
      return [{ sortOrder: direction }, { name: "asc" }];
  }
}

type ResolvedAdminCategoriesListParams = Required<
  Pick<
    AdminCategoriesListParams,
    | "page"
    | "pageSize"
    | "search"
    | "status"
    | "hierarchy"
    | "inTrash"
    | "sortField"
    | "sortDirection"
  >
> &
  Pick<AdminCategoriesListParams, "parentId">;

export async function listAdminCategories(
  params: ResolvedAdminCategoriesListParams,
): Promise<AdminCategoriesListApiResponseData> {
  const where: Prisma.CategoryWhereInput = {
    ...(params.inTrash ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(params.status === ADMIN_CATEGORY_STATUS.active
      ? { isActive: true }
      : {}),
    ...(params.status === ADMIN_CATEGORY_STATUS.inactive
      ? { isActive: false }
      : {}),
    ...(params.hierarchy === ADMIN_CATEGORY_HIERARCHY.root
      ? { parentId: null }
      : {}),
    ...(params.hierarchy === ADMIN_CATEGORY_HIERARCHY.child
      ? { parentId: { not: null } }
      : {}),
    ...(params.parentId ? { parentId: params.parentId } : {}),
    ...(buildSearchWhere(params.search) ?? {}),
  };

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: buildOrderBy(params.sortField, params.sortDirection),
      skip: params.page * params.pageSize,
      take: params.pageSize,
    }) as Promise<CategoryListRecord[]>,
    prisma.category.count({ where }),
  ]);

  return {
    items: items.map(toCategoryListItem),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function listAdminCategoryParentOptions(): Promise<AdminCategoryParentOptionsApiResponseData> {
  const items = (await prisma.category.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })) as CategoryParentOptionRecord[];

  return {
    items: items.map(toCategoryParentOption),
  };
}
