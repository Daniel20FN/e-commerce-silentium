import {
  confirmAdminVariantGeneration,
  previewAdminVariantGeneration,
} from "./admin_variant_generation_service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
    productOption: {
      findMany: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    productOptionValue: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  productOption: { findMany: jest.Mock };
  $transaction: jest.Mock;
  productVariant: {
    findMany: jest.Mock;
    create: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
  };
  product: { findUnique: jest.Mock };
  productOptionValue: { findMany: jest.Mock };
};

describe("admin_variant_generation_service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("previews only non-duplicate variant combinations before confirmation", async () => {
    mockPrisma.productOption.findMany.mockResolvedValue([
      {
        id: "option-color",
        productId: "product-1",
        name: "Color",
        values: [
          { id: "value-white", value: "Blanco", displayOrder: 0 },
          { id: "value-blue", value: "Azul", displayOrder: 1 },
        ],
      },
      {
        id: "option-size",
        productId: "product-1",
        name: "Talle",
        values: [{ id: "value-queen", value: "Queen", displayOrder: 0 }],
      },
    ]);
    mockPrisma.productVariant.findMany.mockResolvedValue([
      { optionCombinationKey: "value-queen:value-white" },
    ]);

    const result = await previewAdminVariantGeneration("product-1", {
      optionIds: ["option-color", "option-size"],
    });

    expect(result.combinations).toEqual([
      {
        optionValueIds: ["value-blue", "value-queen"],
        optionCombinationKey: "value-blue:value-queen",
        label: "Color: Azul / Talle: Queen",
      },
    ]);
    expect(result.duplicateCombinations).toEqual([
      {
        optionValueIds: ["value-white", "value-queen"],
        optionCombinationKey: "value-queen:value-white",
        label: "Color: Blanco / Talle: Queen",
      },
    ]);
  });

  it("creates confirmed non-duplicate combinations explicitly", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: "product-1" });
    mockPrisma.productVariant.findUnique.mockResolvedValue(null);
    mockPrisma.productOptionValue.findMany.mockResolvedValue([
      {
        id: "value-blue",
        option: { id: "option-color", productId: "product-1" },
      },
      {
        id: "value-queen",
        option: { id: "option-size", productId: "product-1" },
      },
    ]);
    mockPrisma.productVariant.findMany.mockResolvedValue([]);
    mockPrisma.productVariant.create.mockResolvedValue({
      id: "variant-blue-queen",
      productId: "product-1",
      sku: "SLT-BLUE-Q",
      priceCents: 6000,
      compareAtPriceCents: null,
      stock: 4,
      isActive: true,
      isDefault: false,
      displayOrder: 0,
      optionCombinationKey: "value-blue:value-queen",
      deletedAt: null,
      createdAt: new Date("2026-06-10T10:00:00.000Z"),
      updatedAt: new Date("2026-06-10T11:00:00.000Z"),
    });

    const result = await confirmAdminVariantGeneration("product-1", {
      variants: [
        {
          sku: "SLT-BLUE-Q",
          priceCents: 6000,
          compareAtPriceCents: null,
          stock: 4,
          active: true,
          isDefault: false,
          displayOrder: 0,
          optionValueIds: ["value-blue", "value-queen"],
        },
      ],
    });

    expect(mockPrisma.productVariant.create).toHaveBeenCalledTimes(1);
    expect(result.created).toHaveLength(1);
  });

  it("skips duplicate combinations during confirmation", async () => {
    mockPrisma.productVariant.findMany.mockResolvedValue([
      { optionCombinationKey: "value-blue:value-queen" },
    ]);

    const result = await confirmAdminVariantGeneration("product-1", {
      variants: [
        {
          sku: "SLT-BLUE-Q",
          priceCents: 6000,
          compareAtPriceCents: null,
          stock: 4,
          active: true,
          isDefault: false,
          displayOrder: 0,
          optionValueIds: ["value-blue", "value-queen"],
        },
      ],
    });

    expect(mockPrisma.productVariant.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      created: [],
      skippedDuplicateCombinationKeys: ["value-blue:value-queen"],
    });
  });
});
