import "server-only";

import type {
  AdminCategoryBulkActionParams,
  AdminCategoryUpsertParams,
} from "@/domains/admin/categories/types/api_params";
import type {
  AdminCategoryBulkActionApiResponseData,
  AdminCategoryBulkExceptionDto,
  AdminCategoryListItemDto,
} from "@/domains/admin/categories/types/api_responses";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryHierarchy,
  type CategoryHierarchyNode,
} from "./admin_category_hierarchy";

export interface AdminCategoryMutationError {
  type: "validation_error" | "conflict" | "not_found" | "invalid_state";
  message: string;
}

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: {
    deletedAt: Date | null;
    isActive: boolean;
    name: string;
  } | null;
}

function createMutationError(
  type: AdminCategoryMutationError["type"],
  message: string,
): AdminCategoryMutationError {
  return {
    type,
    message,
  };
}

function toAdminCategoryListItem(
  category: CategoryRecord,
): AdminCategoryListItemDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    parentIsActive: category.parent?.isActive ?? null,
    parentInTrash: category.parent
      ? category.parent.deletedAt !== null &&
        category.parent.deletedAt !== undefined
      : false,
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

async function assertUniqueSlug(
  slug: string,
  ignoreCategoryId?: string,
): Promise<void> {
  const existingBySlug = await prisma.category.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (!existingBySlug) {
    return;
  }

  if (ignoreCategoryId && existingBySlug.id === ignoreCategoryId) {
    return;
  }

  throw createMutationError("conflict", "category_slug_conflict");
}

async function assertParentExists(parentId: string | null): Promise<void> {
  if (parentId === null) {
    return;
  }

  const parentCategory = await prisma.category.findUnique({
    where: {
      id: parentId,
    },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!parentCategory || parentCategory.deletedAt !== null) {
    throw createMutationError("not_found", "category_parent_not_found");
  }
}

async function assertNoHierarchyCycle(
  categoryId: string,
  nextParentId: string | null,
): Promise<void> {
  const hierarchy = (await prisma.category.findMany({
    select: {
      id: true,
      parentId: true,
    },
  })) as CategoryHierarchyNode[];

  assertCategoryHierarchy({
    categoryId,
    nextParentId,
    hierarchy,
  });
}

export async function createAdminCategory(
  input: AdminCategoryUpsertParams,
): Promise<AdminCategoryListItemDto> {
  await assertUniqueSlug(input.slug);
  await assertParentExists(input.parentId ?? null);

  const createdCategory = (await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      imageUrl: input.imageUrl,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    },
    include: {
      parent: {
        select: {
          deletedAt: true,
          isActive: true,
          name: true,
        },
      },
    },
  })) as CategoryRecord;

  return toAdminCategoryListItem(createdCategory);
}

type AdminCategoryUpdateInput = Partial<AdminCategoryUpsertParams>;

export async function updateAdminCategory(
  categoryId: string,
  input: AdminCategoryUpdateInput,
): Promise<AdminCategoryListItemDto> {
  const currentCategory = (await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    include: {
      parent: {
        select: {
          deletedAt: true,
          isActive: true,
          name: true,
        },
      },
    },
  })) as CategoryRecord | null;

  if (!currentCategory) {
    throw createMutationError("not_found", "record_not_found");
  }

  const nextSlug = input.slug ?? currentCategory.slug;
  const nextParentId =
    input.parentId !== undefined ? input.parentId : currentCategory.parentId;

  await assertUniqueSlug(nextSlug, categoryId);
  await assertParentExists(nextParentId);

  if (nextParentId !== null) {
    try {
      await assertNoHierarchyCycle(categoryId, nextParentId);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "category_self_parent_not_allowed" ||
          error.message === "category_hierarchy_cycle_detected")
      ) {
        throw createMutationError("validation_error", error.message);
      }

      throw error;
    }
  }

  const updatedCategory = (await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
      ...(input.seoDescription !== undefined
        ? { seoDescription: input.seoDescription }
        : {}),
    },
    include: {
      parent: {
        select: {
          deletedAt: true,
          isActive: true,
          name: true,
        },
      },
    },
  })) as CategoryRecord;

  return toAdminCategoryListItem(updatedCategory);
}

export async function trashAdminCategory(
  categoryId: string,
): Promise<AdminCategoryListItemDto> {
  const existingCategory = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (!existingCategory) {
    throw createMutationError("not_found", "record_not_found");
  }

  const activeChild = await prisma.category.findFirst({
    where: {
      parentId: categoryId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (activeChild) {
    throw createMutationError("invalid_state", "category_has_active_children");
  }

  const category = (await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      deletedAt: new Date(),
    },
    include: {
      parent: {
        select: {
          deletedAt: true,
          isActive: true,
          name: true,
        },
      },
    },
  })) as CategoryRecord;

  return toAdminCategoryListItem(category);
}

export async function restoreAdminCategory(categoryId: string): Promise<{
  category: AdminCategoryListItemDto;
  restoreWarnings: string[];
}> {
  const categoryToRestore = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
      parentId: true,
    },
  });

  if (!categoryToRestore) {
    throw createMutationError("not_found", "record_not_found");
  }

  let nextParentId = categoryToRestore.parentId;
  const warnings: string[] = [];

  if (categoryToRestore.parentId !== null) {
    const parentCategory = await prisma.category.findUnique({
      where: {
        id: categoryToRestore.parentId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!parentCategory || parentCategory.deletedAt !== null) {
      nextParentId = null;
      warnings.push("parent_unavailable_restored_as_root");
    }
  }

  const category = (await prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      deletedAt: null,
      parentId: nextParentId,
    },
    include: {
      parent: {
        select: {
          name: true,
        },
      },
    },
  })) as CategoryRecord;

  return {
    category: toAdminCategoryListItem(category),
    restoreWarnings: warnings,
  };
}

export async function applyAdminCategoryBulkAction(
  input: AdminCategoryBulkActionParams,
): Promise<AdminCategoryBulkActionApiResponseData> {
  let successCount = 0;
  const exceptions: AdminCategoryBulkExceptionDto[] = [];

  for (const categoryId of input.categoryIds) {
    try {
      switch (input.action) {
        case "activate":
          await updateAdminCategory(categoryId, { isActive: true });
          break;
        case "deactivate":
          await updateAdminCategory(categoryId, { isActive: false });
          break;
        case "trash":
          await trashAdminCategory(categoryId);
          break;
        case "restore":
          await restoreAdminCategory(categoryId);
          break;
      }

      successCount += 1;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        "message" in error &&
        typeof (error as AdminCategoryMutationError).type === "string" &&
        typeof (error as AdminCategoryMutationError).message === "string"
      ) {
        const mutationError = error as AdminCategoryMutationError;
        exceptions.push({
          categoryId,
          type: mutationError.type,
          message: mutationError.message,
        });
      } else {
        exceptions.push({
          categoryId,
          type: "invalid_state",
          message: "bulk_action_failed",
        });
      }
    }
  }

  return {
    processed: input.categoryIds.length,
    successCount,
    exceptions,
  };
}
