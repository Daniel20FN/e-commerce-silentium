/** @jest-environment node */

import {
  applyAdminCategoryBulkAction,
  createAdminCategory,
  restoreAdminCategory,
  updateAdminCategory,
} from "@/domains/admin/categories/services/admin_category_mutations";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
    findMany: jest.Mock;
  };
};

describe("admin categories acceptance scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects duplicated slug on create", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });

    await expect(
      createAdminCategory({
        name: "Ropa de cama",
        slug: "ropa-de-cama",
        description: null,
        imageUrl: null,
        parentId: null,
        sortOrder: 10,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      }),
    ).rejects.toMatchObject({
      type: "conflict",
      message: "category_slug_conflict",
    });
  });

  it("creates subcategory linked to parent when parent is available", async () => {
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
      parentId: "cat-parent",
      parent: {
        name: "Dormitorio",
      },
      sortOrder: 7,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await createAdminCategory({
      name: "Sábanas",
      slug: "sabanas",
      description: null,
      imageUrl: null,
      parentId: "cat-parent",
      sortOrder: 7,
      isActive: true,
      seoTitle: null,
      seoDescription: null,
    });

    expect(result.parentId).toBe("cat-parent");
    expect(result.parentName).toBe("Dormitorio");
  });

  it("rejects create when parent does not exist", async () => {
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
        sortOrder: 7,
        isActive: true,
        seoTitle: null,
        seoDescription: null,
      }),
    ).rejects.toMatchObject({
      type: "not_found",
      message: "category_parent_not_found",
    });
  });

  it("rejects hierarchy cycle on update", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-a",
        slug: "a",
        parentId: null,
        name: "A",
        sortOrder: 0,
        isActive: true,
        deletedAt: null,
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
        parent: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "cat-c",
        deletedAt: null,
      });
    mockPrisma.category.findMany.mockResolvedValue([
      { id: "cat-a", parentId: null },
      { id: "cat-b", parentId: "cat-a" },
      { id: "cat-c", parentId: "cat-b" },
    ]);

    await expect(
      updateAdminCategory("cat-a", {
        parentId: "cat-c",
      }),
    ).rejects.toMatchObject({
      type: "validation_error",
      message: "category_hierarchy_cycle_detected",
    });
  });

  it("restores as root when original parent is unavailable", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-child",
        parentId: "missing-parent",
      })
      .mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-child",
      name: "Sábanas",
      slug: "sabanas",
      parentId: null,
      parent: null,
      sortOrder: 0,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await restoreAdminCategory("cat-child");

    expect(result.restoreWarnings).toEqual([
      "parent_unavailable_restored_as_root",
    ]);
  });

  it("returns partial report for bulk action with mixed eligibility", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-ok",
        parentId: null,
      })
      .mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-ok",
      name: "Ok",
      slug: "ok",
      parentId: null,
      parent: null,
      sortOrder: 0,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await applyAdminCategoryBulkAction({
      action: "restore",
      categoryIds: ["cat-ok", "cat-missing"],
    });

    expect(result).toEqual({
      processed: 2,
      successCount: 1,
      exceptions: [
        {
          categoryId: "cat-missing",
          type: "not_found",
          message: "record_not_found",
        },
      ],
    });
  });

  it("persists manual sort order update", async () => {
    mockPrisma.category.findUnique
      .mockResolvedValueOnce({
        id: "cat-1",
        slug: "sabanas",
        parentId: null,
        name: "Sábanas",
        description: null,
        imageUrl: null,
        sortOrder: 10,
        isActive: true,
        deletedAt: null,
        seoTitle: null,
        seoDescription: null,
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
        parent: null,
      })
      .mockResolvedValueOnce(null);
    mockPrisma.category.update.mockResolvedValue({
      id: "cat-1",
      name: "Sábanas",
      slug: "sabanas",
      parentId: null,
      parent: null,
      sortOrder: 3,
      isActive: true,
      deletedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await updateAdminCategory("cat-1", {
      sortOrder: 3,
    });

    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sortOrder: 3,
        }),
      }),
    );
    expect(result.sortOrder).toBe(3);
  });
});
