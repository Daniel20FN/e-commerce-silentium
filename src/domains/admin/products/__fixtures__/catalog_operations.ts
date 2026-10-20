import type { AdminProductVariantDto } from "../types/product_dto";
import { savedProduct } from "./publication";

export const operationProduct = {
  ...savedProduct,
  options: [],
  optionsLocked: false,
};
export const operationVariants: AdminProductVariantDto[] = ["A", "B"].map(
  (name, index) => ({
    id: `variant-${name}`,
    productId: operationProduct.id,
    sku: `QA-${name}`,
    priceCents: 10000 + index * 10000,
    compareAtPriceCents: null,
    stock: 3,
    active: true,
    isDefault: index === 0,
    displayOrder: index,
    weightGrams: null,
    widthMm: null,
    heightMm: null,
    lengthMm: null,
    optionValues: [],
    inTrash: false,
    createdAt: operationProduct.createdAt,
    updatedAt: operationProduct.updatedAt,
  }),
);
