import { ADMIN_PRODUCT_ERROR } from "../types/product_errors";
import {
  createAdminVariant,
  listAdminProductVariants,
  listStorefrontSellableVariants,
  restoreAdminVariant,
  softDeleteAdminVariant,
  updateAdminVariant,
  type AdminVariantMutationError,
} from "./admin_variant_service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    productOptionValue: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  product: { findUnique: jest.Mock };
  productVariant: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  productOptionValue: { findMany: jest.Mock };
};

const variantRecord = {
  id: "variant-1",
  productId: "product-1",
  sku: "SLT-SABANA-WHITE-Q",
  priceCents: 5000,
  compareAtPriceCents: 7000,
  stock: 0,
  isActive: true,
  isDefault: false,
  displayOrder: 0,
  weightGrams: null,
  widthMm: null,
  heightMm: null,
  lengthMm: null,
  optionCombinationKey: "value-queen:value-white",
  deletedAt: null,
  createdAt: new Date("2026-06-10T10:00:00.000Z"),
  updatedAt: new Date("2026-06-10T11:00:00.000Z"),
};

const variantInput = {
  sku: "SLT-SABANA-WHITE-Q",
  priceCents: 5000,
  compareAtPriceCents: 7000,
  stock: 0,
  active: true,
  isDefault: false,
  displayOrder: 0,
  weightGrams: null,
  widthMm: null,
  heightMm: null,
  lengthMm: null,
  optionValueIds: ["value-white", "value-queen"],
};

describe("admin_variant_service", () => {
  it("returns persisted physical measurements for edit hydration", async () => {
    mockPrisma.productVariant.findMany.mockResolvedValue([
      {
        ...variantRecord,
        weightGrams: 123,
        widthMm: 456,
        heightMm: 78,
        lengthMm: 900,
      },
    ]);
    const result = await listAdminProductVariants({ productId: "product-1" });
    expect(result.items[0]).toMatchObject({
      weightGrams: 123,
      widthMm: 456,
      heightMm: 78,
      lengthMm: 900,
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates variants with validated same-product option combination keys", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1" });
    mockPrisma.productVariant.findUnique.mockResolvedValue(null);
    mockPrisma.productOptionValue.findMany.mockResolvedValue([
      {
        id: "value-white",
        option: { id: "option-color", productId: "product-1" },
      },
      {
        id: "value-queen",
        option: { id: "option-size", productId: "product-1" },
      },
    ]);
    mockPrisma.productVariant.findMany.mockResolvedValue([]);
    mockPrisma.productVariant.create.mockResolvedValue(variantRecord);

    const result = await createAdminVariant("product-1", variantInput);

    expect(mockPrisma.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          optionCombinationKey: "value-queen:value-white",
          optionValues: {
            create: [
              { optionValue: { connect: { id: "value-white" } } },
              { optionValue: { connect: { id: "value-queen" } } },
            ],
          },
        }),
      }),
    );
    expect(result.optionValues).toEqual([]);
    expect(result.inTrash).toBe(false);
  });

  it("rejects option values outside the product before creating variants", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1" });
    mockPrisma.productVariant.findUnique.mockResolvedValue(null);
    mockPrisma.productOptionValue.findMany.mockResolvedValue([
      {
        id: "value-white",
        option: { id: "option-color", productId: "product-1" },
      },
      { id: "value-foreign", option: { productId: "product-2" } },
    ]);
    mockPrisma.productVariant.findMany.mockResolvedValue([]);

    await expect(
      createAdminVariant("product-1", {
        ...variantInput,
        optionValueIds: ["value-white", "value-foreign"],
      }),
    ).rejects.toMatchObject<AdminVariantMutationError>({
      type: "validation_error",
      message: ADMIN_PRODUCT_ERROR.variantOptionValueInvalid,
    });

    expect(mockPrisma.productVariant.create).not.toHaveBeenCalled();
  });

  it("keeps stock-0 variants visible in admin but filters storefront sellability to stock greater than zero", async () => {
    mockPrisma.productVariant.findMany.mockResolvedValueOnce([
      {
        ...variantRecord,
        weightGrams: null,
        widthMm: null,
        heightMm: null,
        lengthMm: null,
        optionValues: [
          {
            optionValue: {
              id: "value-queen",
              value: "Queen",
              option: { id: "option-size", name: "Tamaño", displayOrder: 0 },
            },
          },
          {
            optionValue: {
              id: "value-white",
              value: "Blanco",
              option: { id: "option-color", name: "Color", displayOrder: 1 },
            },
          },
        ],
      },
    ]);

    const adminResult = await listAdminProductVariants({
      productId: "product-1",
      includeTrash: false,
    });

    expect(adminResult.items).toHaveLength(1);
    expect(adminResult.items[0]).toMatchObject({
      stock: 0,
      active: true,
      weightGrams: null,
      widthMm: null,
      heightMm: null,
      lengthMm: null,
      optionValues: [
        {
          optionId: "option-size",
          optionName: "Tamaño",
          optionValueId: "value-queen",
          optionValue: "Queen",
        },
        {
          optionId: "option-color",
          optionName: "Color",
          optionValueId: "value-white",
          optionValue: "Blanco",
        },
      ],
    });
    expect(mockPrisma.productVariant.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        include: expect.objectContaining({ optionValues: expect.anything() }),
      }),
    );

    mockPrisma.productVariant.findMany.mockResolvedValueOnce([
      { ...variantRecord, id: "variant-sellable", stock: 2 },
    ]);

    await listStorefrontSellableVariants("product-1");

    expect(mockPrisma.productVariant.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          productId: "product-1",
          deletedAt: null,
          isActive: true,
          stock: { gt: 0 },
        },
      }),
    );
  });

  it("updates variants while preserving SKU self-matches and replacing option values", async () => {
    mockPrisma.productVariant.findUnique
      .mockResolvedValueOnce({
        id: "variant-1",
        productId: "product-1",
        optionCombinationKey: "value-queen:value-white",
      })
      .mockResolvedValueOnce({ id: "variant-1" });
    mockPrisma.productOptionValue.findMany.mockResolvedValue([
      {
        id: "value-white",
        option: { id: "option-size", productId: "product-1" },
      },
      { id: "value-queen", option: { productId: "product-1" } },
    ]);
    mockPrisma.productVariant.findMany.mockResolvedValue([]);
    mockPrisma.productVariant.update.mockResolvedValue({
      ...variantRecord,
      stock: 8,
      updatedAt: new Date("2026-06-10T12:00:00.000Z"),
    });

    const result = await updateAdminVariant("product-1", "variant-1", {
      ...variantInput,
      stock: 8,
    });

    expect(mockPrisma.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "variant-1" },
        data: expect.objectContaining({
          stock: 8,
          optionValues: expect.objectContaining({ deleteMany: {} }),
        }),
      }),
    );
    expect(result.stock).toBe(8);
  });

  it("rejects variant updates when the variant belongs to another product", async () => {
    mockPrisma.productVariant.findUnique.mockResolvedValueOnce({
      id: "variant-1",
      productId: "product-2",
      optionCombinationKey: "value-queen:value-white",
    });

    await expect(
      updateAdminVariant("product-1", "variant-1", variantInput),
    ).rejects.toMatchObject<AdminVariantMutationError>({
      type: "not_found",
      message: "record_not_found",
    });

    expect(mockPrisma.productVariant.update).not.toHaveBeenCalled();
  });

  it.each([softDeleteAdminVariant, restoreAdminVariant])(
    "rejects cross-product lifecycle mutations",
    async (mutate) => {
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        id: "variant-1",
        productId: "other",
      });
      await expect(mutate("product-1", "variant-1")).rejects.toMatchObject({
        type: "not_found",
      });
      expect(mockPrisma.productVariant.update).not.toHaveBeenCalled();
    },
  );

  it("restores soft-deleted variants", async () => {
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      id: "variant-1",
      productId: "product-1",
    });
    mockPrisma.productVariant.update.mockResolvedValue({
      ...variantRecord,
      deletedAt: null,
    });

    const result = await restoreAdminVariant("product-1", "variant-1");

    expect(mockPrisma.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: null } }),
    );
    expect(result.inTrash).toBe(false);
  });

  it("soft-deletes variants without removing identity", async () => {
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      id: "variant-1",
      productId: "product-1",
    });
    mockPrisma.productVariant.update.mockResolvedValue({
      ...variantRecord,
      deletedAt: new Date("2026-06-10T12:00:00.000Z"),
    });

    const result = await softDeleteAdminVariant("product-1", "variant-1", {
      now: new Date("2026-06-10T12:00:00.000Z"),
    });

    expect(mockPrisma.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deletedAt: new Date("2026-06-10T12:00:00.000Z") },
      }),
    );
    expect(result.inTrash).toBe(true);
  });
});
