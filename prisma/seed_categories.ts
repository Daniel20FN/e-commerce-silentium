export interface CategorySeedDefinition {
  slug: string;
  name: string;
  parentSlug: string | null;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: Date;
}

export const CATEGORY_SEED_DATA: readonly CategorySeedDefinition[] = [
  {
    slug: "ropa-de-cama",
    name: "Ropa de cama",
    parentSlug: null,
    sortOrder: 10,
    isActive: true,
  },
  {
    slug: "sabana-ajustable",
    name: "Sábana ajustable",
    parentSlug: "ropa-de-cama",
    sortOrder: 20,
    isActive: true,
  },
  {
    slug: "accesorios",
    name: "Accesorios",
    parentSlug: null,
    sortOrder: 30,
    isActive: false,
  },
  {
    slug: "archivo-catalogo",
    name: "Archivo catálogo",
    parentSlug: null,
    sortOrder: 40,
    isActive: false,
    deletedAt: new Date("2026-01-10T10:00:00.000Z"),
  },
] as const;

export function sortCategorySeedByHierarchy(
  categories: readonly CategorySeedDefinition[],
): CategorySeedDefinition[] {
  return [...categories].sort((left, right) => {
    if (left.parentSlug === null && right.parentSlug !== null) {
      return -1;
    }

    if (left.parentSlug !== null && right.parentSlug === null) {
      return 1;
    }

    return left.sortOrder - right.sortOrder;
  });
}

interface SeedCategoryPrismaClient {
  category: {
    upsert: (args: {
      where: {
        slug: string;
      };
      create: {
        slug: string;
        name: string;
        sortOrder: number;
        isActive: boolean;
        deletedAt: Date | null;
        parent?: {
          connect: {
            id: string;
          };
        };
      };
      update: {
        name: string;
        sortOrder: number;
        isActive: boolean;
        deletedAt: Date | null;
        parentId: string | null;
      };
    }) => Promise<{ id: string }>;
  };
}

export async function seedCategories(
  prisma: SeedCategoryPrismaClient,
): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();
  const sortedCategories = sortCategorySeedByHierarchy(CATEGORY_SEED_DATA);

  for (const category of sortedCategories) {
    const parentId = category.parentSlug
      ? (categoryIdBySlug.get(category.parentSlug) ?? null)
      : null;

    const result = await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      create: {
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        deletedAt: category.deletedAt ?? null,
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        deletedAt: category.deletedAt ?? null,
        parentId,
      },
    });

    categoryIdBySlug.set(category.slug, result.id);
  }
}
