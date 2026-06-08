import {
  listAdminCategories,
  listAdminCategoryParentOptions,
} from "./admin_category_queries";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  category: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

describe("admin_category_queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists categories with server-side filters and pagination", async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: "cat-1",
        name: "Ropa de cama",
        slug: "ropa-de-cama",
        description: "Textiles para dormitorio",
        imageUrl: "https://example.com/ropa-de-cama.webp",
        parentId: null,
        parent: null,
        sortOrder: 10,
        isActive: true,
        deletedAt: null,
        seoTitle: "Ropa de cama Silentium",
        seoDescription: "Textiles suaves para descansar mejor",
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      },
    ]);
    mockPrisma.category.count.mockResolvedValue(1);

    const result = await listAdminCategories({
      page: 0,
      pageSize: 10,
      search: "ropa cama",
      status: "active",
      hierarchy: "root",
      inTrash: false,
      sortField: "name",
      sortDirection: "asc",
    });

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "cat-1",
      slug: "ropa-de-cama",
      description: "Textiles para dormitorio",
      imageUrl: "https://example.com/ropa-de-cama.webp",
      inTrash: false,
      seoTitle: "Ropa de cama Silentium",
      seoDescription: "Textiles suaves para descansar mejor",
      productsCount: null,
    });
  });

  it("lists trash categories and child filter combinations", async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);
    mockPrisma.category.count.mockResolvedValue(0);

    await listAdminCategories({
      page: 1,
      pageSize: 25,
      search: "",
      status: "all",
      hierarchy: "child",
      inTrash: true,
      sortField: "updatedAt",
      sortDirection: "desc",
    });

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: { not: null },
          parentId: { not: null },
        }),
        skip: 25,
        take: 25,
      }),
    );
  });

  it("lists active non-trash parent options without pagination", async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: "cat-parent-1",
        name: "Dormitorio",
      },
      {
        id: "cat-parent-2",
        name: "Textiles",
      },
    ]);

    const result = await listAdminCategoryParentOptions();

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    expect(mockPrisma.category.count).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [
        {
          id: "cat-parent-1",
          name: "Dormitorio",
        },
        {
          id: "cat-parent-2",
          name: "Textiles",
        },
      ],
    });
  });
});
