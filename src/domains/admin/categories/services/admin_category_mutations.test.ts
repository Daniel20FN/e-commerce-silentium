import {
  applyAdminCategoryBulkAction,
  createAdminCategory,
  restoreAdminCategory,
  trashAdminCategory,
  updateAdminCategory,
  type AdminCategoryMutationError,
} from "./admin_category_mutations";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  category: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findFirst: jest.Mock;
  };
};

describe("admin_category_mutations slug uniqueness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns conflict when creating a category with duplicated slug", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "existing-1" });

    await expect(
      createAdminCategory({
        name: "Sábanas premium",
        slug: "sabanas-premium",
        description: null,
        imageUrl: null,
        parentId: null,
        sortOrder: 10,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      }),
    ).rejects.toMatchObject<AdminCategoryMutationError>({
      type: "conflict",
      message: "category_slug_conflict",
    });

    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("creates subcategory linked to an existing parent", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "cat-parent",
        deletedAt: null,
      });
    mockPrisma.category.create.mockResolvedValue({
      id: "cat-child",
      name: "Sábanas",
      slug: "sabanas",
      description: "Sabanas premium",
      imageUrl: "https://example.com/sabanas.webp",
      parentId: "cat-parent",
      parent: {
        name: "Dormitorio",
      },
      sortOrder: 5,
      isActive: true,
      deletedAt: null,
      seoTitle: "Sabanas Silentium",
      seoDescription: "Sabanas premium para dormitorio",
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await createAdminCategory({
      name: "Sábanas",
      slug: "sabanas",
      description: null,
      imageUrl: null,
      parentId: "cat-parent",
      sortOrder: 5,
      isActive: true,
      seoTitle: null,
      seoDescription: null,
    });

    expect(mockPrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: "cat-parent",
        }),
      }),
    );
    expect(result.parentId).toBe("cat-parent");
    expect(result.parentName).toBe("Dormitorio");
    expect(result.description).toBe("Sabanas premium");
    expect(result.imageUrl).toBe("https://example.com/sabanas.webp");
    expect(result.seoTitle).toBe("Sabanas Silentium");
    expect(result.seoDescription).toBe("Sabanas premium para dormitorio");
  });

  it("returns not_found when parent does not exist on create", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      createAdminCategory({
        name: "Sábanas",
        slug: "sabanas",
        description: null,
        imageUrl: null,
        parentId: "cat-parent-missing",
        sortOrder: 5,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      }),
    ).rejects.toMatchObject<AdminCategoryMutationError>({
      type: "not_found",
      message: "category_parent_not_found",
    });
  });

  it("returns conflict when updating category slug into existing one", async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: "cat-1",
      parentId: null,
      slug: "almohadas",
      name: "Almohadas",
      description: null,
      imageUrl: null,
      sortOrder: 20,
      isActive: true,
      deletedAt: null,
      seoTitle: null,
      seoDescription: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: null,
    });
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: "cat-2" });

    await expect(
      updateAdminCategory("cat-1", {
        slug: "sabanas-premium",
      }),
    ).rejects.toMatchObject<AdminCategoryMutationError>({
      type: "conflict",
      message: "category_slug_conflict",
    });

    expect(mockPrisma.category.update).not.toHaveBeenCalled();
  });
});

describe("admin_category_mutations restore parent behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("restores category preserving parent when parent is available", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-child",
        parentId: "cat-parent",
      })
      .mockResolvedValueOnce({
        id: "cat-parent",
        deletedAt: null,
      });
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-child",
      parentId: "cat-parent",
      slug: "sabanas",
      name: "Sábanas",
      sortOrder: 10,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: {
        name: "Dormitorio",
      },
    });

    const result = await restoreAdminCategory("cat-child");

    expect(result.restoreWarnings).toEqual([]);
    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: "cat-parent",
        }),
      }),
    );
  });
});

describe("admin_category_mutations trash and restore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks trash when category has active children", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: "cat-parent",
      parentId: null,
      slug: "ropa-de-cama",
      name: "Ropa de cama",
      sortOrder: 10,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: null,
    });
    mockPrisma.category.findFirst.mockResolvedValue({
      id: "cat-child",
    });

    await expect(
      trashAdminCategory("cat-parent"),
    ).rejects.toMatchObject<AdminCategoryMutationError>({
      type: "invalid_state",
      message: "category_has_active_children",
    });

    expect(mockPrisma.category.update).not.toHaveBeenCalled();
  });

  it("restores as root when parent is missing and returns warning", async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({
      id: "cat-child",
      parentId: "missing-parent",
      slug: "sabana-ajustable",
      name: "Sábana ajustable",
      sortOrder: 10,
      isActive: true,
      deletedAt: new Date("2026-04-18T10:00:00.000Z"),
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: null,
    });
    mockPrisma.category.findUnique.mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-child",
      parentId: null,
      slug: "sabana-ajustable",
      name: "Sábana ajustable",
      sortOrder: 10,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: null,
    });

    const result = await restoreAdminCategory("cat-child");

    expect(result.restoreWarnings).toEqual([
      "parent_unavailable_restored_as_root",
    ]);
    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedAt: null,
          parentId: null,
        }),
      }),
    );
  });
});

describe("admin_category_mutations bulk actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports partial success with item exceptions", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-ok",
        parentId: null,
        slug: "cat-ok",
        name: "Cat ok",
        sortOrder: 10,
        isActive: true,
        deletedAt: new Date("2026-04-18T10:00:00.000Z"),
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
        parent: null,
      })
      .mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-ok",
      parentId: null,
      slug: "cat-ok",
      name: "Cat ok",
      sortOrder: 10,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      parent: null,
    });

    const result = await applyAdminCategoryBulkAction({
      action: "restore",
      categoryIds: ["cat-ok", "cat-missing"],
    });

    expect(result.processed).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.exceptions).toEqual([
      {
        categoryId: "cat-missing",
        type: "not_found",
        message: "record_not_found",
      },
    ]);
  });
});
