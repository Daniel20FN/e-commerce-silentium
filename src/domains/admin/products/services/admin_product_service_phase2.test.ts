import { ADMIN_PRODUCT_ERROR } from "../types/product_errors";
import {
  archiveAdminProduct,
  createAdminProduct,
  getAdminProductDetail,
  listAdminProducts,
  restoreAdminProduct,
  trashAdminProduct,
  updateAdminProduct,
  type AdminProductMutationError,
} from "./admin_product_service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  product: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  productVariant: {
    count: jest.Mock;
  };
  category: {
    findMany: jest.Mock;
  };
};

const productRecord = {
  id: "product-1",
  name: "Sábana premium",
  slug: "sabana-premium",
  status: "active",
  deletedAt: null,
  archivedAt: null,
  brand: "Silentium",
  featured: true,
  createdAt: new Date("2026-06-10T10:00:00.000Z"),
  updatedAt: new Date("2026-06-10T11:00:00.000Z"),
  categories: [
    {
      isPrimary: true,
      category: {
        id: "cat-sheets",
        name: "Sábanas",
        slug: "sabanas",
      },
    },
  ],
  variants: [
    { active: true, deletedAt: null, stock: 0 },
    { active: false, deletedAt: null, stock: 3 },
  ],
};

const upsertInput = {
  name: "Sábana premium",
  slug: "sabana-premium",
  shortDescription: null,
  longDescription: null,
  brand: "Silentium",
  seoTitle: null,
  seoDescription: null,
  featured: true,
  status: "active" as const,
  categoryIds: ["cat-sheets"],
  primaryCategoryId: "cat-sheets",
  options: [
    {
      name: "Color",
      displayOrder: 0,
      values: [{ value: "Blanco", displayOrder: 0 }],
    },
  ],
};

describe("admin_product_service", () => {
  it("searches variant SKUs and combines stock and discount filters with pagination", async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);
    await listAdminProducts({
      page: 1,
      pageSize: 10,
      search: "QA-SKU",
      status: "all",
      inTrash: false,
      sortField: "name",
      sortDirection: "asc",
      stock: "in_stock",
      discounted: true,
    });
    const query = mockPrisma.product.findMany.mock.calls.at(-1)?.[0];
    expect(query).toMatchObject({ skip: 10, take: 10 });
    expect(JSON.stringify(query.where)).toContain('"sku":{"contains":"QA-SKU"');
    expect(JSON.stringify(query.where)).toContain('"stock":{"gt":0}');
    expect(JSON.stringify(query.where)).toContain('"compareAtPriceCents"');
    expect(mockPrisma.product.count).toHaveBeenCalledWith({
      where: query.where,
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.productVariant.count.mockResolvedValue(0);
  });

  it("lists products with admin-visible stock-0 variants and sellability warnings", async () => {
    mockPrisma.product.findMany.mockResolvedValue([productRecord]);
    mockPrisma.product.count.mockResolvedValue(1);

    const result = await listAdminProducts({
      page: 0,
      pageSize: 10,
      search: "sabana",
      status: "active",
      categoryId: "cat-sheets",
      brand: "Silentium",
      featured: true,
      inTrash: false,
      sortField: "updatedAt",
      sortDirection: "desc",
    });

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: "active",
          featured: true,
          brand: { contains: "Silentium", mode: "insensitive" },
          categories: { some: { categoryId: "cat-sheets" } },
        }),
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }, { id: "asc" }],
      }),
    );
    expect(result.items[0]).toMatchObject({
      variantCount: 2,
      sellableVariantCount: 0,
      hasSellableVariants: false,
      warnings: [ADMIN_PRODUCT_ERROR.productHasNoSellableVariants],
    });
  });

  it("returns ordered product options and values for edit hydration", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      ...productRecord,
      options: [
        {
          id: "option-size",
          name: "Tamaño",
          displayOrder: 0,
          values: [
            { id: "value-queen", value: "Queen", displayOrder: 0 },
            { id: "value-king", value: "King", displayOrder: 1 },
          ],
        },
      ],
    });

    const result = await getAdminProductDetail("product-1");

    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-1" },
        include: expect.objectContaining({
          options: expect.objectContaining({
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      optionsLocked: true,
      options: [
        {
          id: "option-size",
          name: "Tamaño",
          displayOrder: 0,
          values: [
            { id: "value-queen", value: "Queen", displayOrder: 0 },
            { id: "value-king", value: "King", displayOrder: 1 },
          ],
        },
      ],
    });
  });

  it("requires active non-deleted categories and a valid manual primary category on create", async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.category.findMany.mockResolvedValue([]);

    await expect(
      createAdminProduct(upsertInput),
    ).rejects.toMatchObject<AdminProductMutationError>({
      type: "validation_error",
      message: ADMIN_PRODUCT_ERROR.categoryRequired,
    });

    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  it("creates products through domain fields without media shortcuts", async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-sheets" }]);
    mockPrisma.product.create.mockResolvedValue(productRecord);

    await createAdminProduct(upsertInput);

    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ imageUrl: expect.anything() }),
      }),
    );
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categories: {
            create: [
              {
                category: { connect: { id: "cat-sheets" } },
                isPrimary: true,
              },
            ],
          },
          options: {
            create: [
              {
                name: "Color",
                displayOrder: 0,
                values: {
                  create: [{ value: "Blanco", displayOrder: 0 }],
                },
              },
            ],
          },
        }),
      }),
    );
  });

  it("updates products and replaces category relations with the manual primary category", async () => {
    mockPrisma.product.findUnique
      .mockResolvedValueOnce({ id: "product-1" })
      .mockResolvedValueOnce({ id: "product-1" });
    mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-sheets" }]);
    mockPrisma.product.update.mockResolvedValue({
      ...productRecord,
      updatedAt: new Date("2026-06-10T12:00:00.000Z"),
    });

    await updateAdminProduct("product-1", upsertInput);

    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "product-1",
          deletedAt: null,
          status: { not: "archived" },
        }),
        data: expect.objectContaining({
          categories: {
            deleteMany: {},
            create: [
              {
                category: { connect: { id: "cat-sheets" } },
                isPrimary: true,
              },
            ],
          },
        }),
      }),
    );
  });

  it("rejects option changes when variants already reference product option values", async () => {
    mockPrisma.product.findUnique
      .mockResolvedValueOnce({ id: "product-1" })
      .mockResolvedValueOnce({ id: "product-1" });
    mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-sheets" }]);
    mockPrisma.productVariant.count.mockResolvedValue(1);

    await expect(
      updateAdminProduct("product-1", upsertInput),
    ).rejects.toMatchObject<AdminProductMutationError>({
      type: "validation_error",
      message: ADMIN_PRODUCT_ERROR.productOptionsLockedByVariants,
    });

    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  it("updates product fields when options are omitted even if variants exist", async () => {
    mockPrisma.product.findUnique
      .mockResolvedValueOnce({ id: "product-1" })
      .mockResolvedValueOnce({ id: "product-1" });
    mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-sheets" }]);
    mockPrisma.productVariant.count.mockResolvedValue(1);
    mockPrisma.product.update.mockResolvedValue(productRecord);

    await updateAdminProduct("product-1", {
      ...upsertInput,
      options: undefined,
    });

    expect(mockPrisma.productVariant.count).not.toHaveBeenCalled();
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          options: expect.anything(),
        }),
      }),
    );
  });

  it("trashes and restores products without archiving them", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1" });
    mockPrisma.product.update
      .mockResolvedValueOnce({
        ...productRecord,
        deletedAt: new Date("2026-06-10T12:00:00.000Z"),
      })
      .mockResolvedValueOnce({ ...productRecord, deletedAt: null });

    const trashed = await trashAdminProduct("product-1", {
      now: new Date("2026-06-10T12:00:00.000Z"),
    });
    const restored = await restoreAdminProduct("product-1");

    expect(mockPrisma.product.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: { deletedAt: new Date("2026-06-10T12:00:00.000Z") },
      }),
    );
    expect(mockPrisma.product.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: { deletedAt: null } }),
    );
    expect(trashed.inTrash).toBe(true);
    expect(restored.inTrash).toBe(false);
  });

  it("archives products by setting status and archivedAt together", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1" });
    mockPrisma.product.update.mockResolvedValue({
      ...productRecord,
      status: "archived",
      archivedAt: new Date("2026-06-10T12:00:00.000Z"),
    });

    const result = await archiveAdminProduct("product-1", {
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "archived",
          archivedAt: new Date("2026-06-10T12:00:00.000Z"),
        },
      }),
    );
    expect(result.status).toBe("archived");
    expect(result.archivedAt).toBe("2026-06-10T12:00:00.000Z");
  });
  it("rejects stale product revisions before writing", async () => {
    mockPrisma.product.findUnique
      .mockReset()
      .mockResolvedValue({ ...productRecord });
    await expect(
      updateAdminProduct("product-1", {
        ...upsertInput,
        expectedUpdatedAt: "2026-06-10T10:00:00.000Z",
      }),
    ).rejects.toMatchObject({
      type: "conflict",
      message: "product_revision_conflict",
    });
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });
  it("includes the expected product revision in the atomic update predicate", async () => {
    mockPrisma.product.findUnique
      .mockReset()
      .mockResolvedValueOnce(productRecord)
      .mockResolvedValueOnce({ id: "product-1" });
    mockPrisma.category.findMany.mockResolvedValue([{ id: "cat-sheets" }]);
    mockPrisma.product.update.mockResolvedValue(productRecord);
    await updateAdminProduct("product-1", {
      ...upsertInput,
      options: undefined,
      expectedUpdatedAt: productRecord.updatedAt.toISOString(),
    });
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          updatedAt: productRecord.updatedAt,
          deletedAt: null,
          status: { not: "archived" },
        }),
      }),
    );
  });
  it.each([
    { ...productRecord, status: "archived" },
    { ...productRecord, deletedAt: new Date() },
  ])("does not edit an archived or trashed product", async (record) => {
    mockPrisma.product.findUnique.mockReset().mockResolvedValue(record);
    await expect(
      updateAdminProduct("product-1", upsertInput),
    ).rejects.toMatchObject({
      type: "invalid_state",
      message: "product_read_only",
    });
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });
});
