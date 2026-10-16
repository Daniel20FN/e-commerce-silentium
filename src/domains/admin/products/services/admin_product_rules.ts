import type {
  AdminProductStatus,
  AdminProductUpsertStatus,
} from "../types/product_dto";
import type { AdminProductErrorCode } from "../types/product_errors";
import {
  ADMIN_PRODUCT_ERROR,
  createAdminProductRuleError,
} from "../types/product_errors";

export interface ProductSlugAvailabilityInput {
  slug: string;
  existingProductId?: string | null;
  currentProductId?: string;
}

export interface ProductCategoryValidationInput {
  status: AdminProductUpsertStatus;
  categoryIds: string[];
  primaryCategoryId: string | null;
  activeCategoryIds: string[];
}

export interface VariantSkuAvailabilityInput {
  sku: string;
  existingVariantId?: string | null;
  currentVariantId?: string;
}

export interface VariantCombinationAvailabilityInput {
  productId: string;
  optionValueIds: string[];
  optionValues: ProductOptionValueOwnership[];
  existingCombinationKeys: string[];
  currentCombinationKey?: string;
}

export interface ProductOptionValueOwnership {
  id: string;
  productId: string;
  optionId: string;
}

export interface ValidatedOptionCombinationInput {
  productId: string;
  optionValueIds: string[];
  optionValues: ProductOptionValueOwnership[];
}

export interface CompareAtPriceInput {
  priceCents: number;
  compareAtPriceCents: number | null;
}

export interface VariantSellabilityInput {
  active: boolean;
  deletedAt: Date | null;
  stock: number;
}

export interface ProductSellabilityWarningInput {
  status: AdminProductStatus;
  variants: VariantSellabilityInput[];
}

export interface ArchiveState {
  status: Extract<AdminProductStatus, "archived">;
  archivedAt: Date;
}

export function assertProductSlugAvailable(
  input: ProductSlugAvailabilityInput,
): void {
  if (!input.existingProductId) {
    return;
  }

  if (input.currentProductId === input.existingProductId) {
    return;
  }

  throw createAdminProductRuleError(ADMIN_PRODUCT_ERROR.slugConflict);
}

export function assertProductCategories(
  input: ProductCategoryValidationInput,
): void {
  const activeCategoryIds = new Set(input.activeCategoryIds);
  const activeAssociatedCategoryIds = input.categoryIds.filter((categoryId) =>
    activeCategoryIds.has(categoryId),
  );

  if (activeAssociatedCategoryIds.length === 0) {
    throw createAdminProductRuleError(ADMIN_PRODUCT_ERROR.categoryRequired);
  }

  if (
    input.primaryCategoryId === null ||
    !activeAssociatedCategoryIds.includes(input.primaryCategoryId)
  ) {
    throw createAdminProductRuleError(
      ADMIN_PRODUCT_ERROR.primaryCategoryInvalid,
    );
  }
}

export function assertVariantSkuAvailable(
  input: VariantSkuAvailabilityInput,
): void {
  if (!input.existingVariantId) {
    return;
  }

  if (input.currentVariantId === input.existingVariantId) {
    return;
  }

  throw createAdminProductRuleError(ADMIN_PRODUCT_ERROR.variantSkuConflict);
}

export function buildOptionCombinationKey(optionValueIds: string[]): string {
  return [...optionValueIds]
    .sort((left, right) => left.localeCompare(right))
    .join(":");
}

export function buildValidatedOptionCombinationKey(
  input: ValidatedOptionCombinationInput,
): string {
  const uniqueOptionValueIds = new Set(input.optionValueIds);

  if (uniqueOptionValueIds.size !== input.optionValueIds.length) {
    throw createAdminProductRuleError(
      ADMIN_PRODUCT_ERROR.variantOptionValueDuplicate,
    );
  }

  const optionValueOwnership = new Map(
    input.optionValues.map((optionValue) => [optionValue.id, optionValue]),
  );
  const selectedOptionIds = new Set<string>();

  for (const optionValueId of input.optionValueIds) {
    const optionValue = optionValueOwnership.get(optionValueId);

    if (!optionValue || optionValue.productId !== input.productId) {
      throw createAdminProductRuleError(
        ADMIN_PRODUCT_ERROR.variantOptionValueInvalid,
      );
    }

    if (selectedOptionIds.has(optionValue.optionId)) {
      throw createAdminProductRuleError(
        ADMIN_PRODUCT_ERROR.variantOptionValueDuplicate,
      );
    }

    selectedOptionIds.add(optionValue.optionId);
  }

  return buildOptionCombinationKey(input.optionValueIds);
}

export function assertVariantCombinationAvailable(
  input: VariantCombinationAvailabilityInput,
): void {
  const combinationKey = buildValidatedOptionCombinationKey({
    productId: input.productId,
    optionValueIds: input.optionValueIds,
    optionValues: input.optionValues,
  });

  if (input.currentCombinationKey === combinationKey) {
    return;
  }

  if (input.existingCombinationKeys.includes(combinationKey)) {
    throw createAdminProductRuleError(
      ADMIN_PRODUCT_ERROR.variantCombinationConflict,
    );
  }
}

export function assertCompareAtPrice(input: CompareAtPriceInput): void {
  if (input.compareAtPriceCents === null) {
    return;
  }

  if (input.compareAtPriceCents <= input.priceCents) {
    throw createAdminProductRuleError(
      ADMIN_PRODUCT_ERROR.compareAtPriceInvalid,
    );
  }
}

export function isVariantSellable(input: VariantSellabilityInput): boolean {
  return input.active && input.deletedAt === null && input.stock > 0;
}

export function getProductSellabilityWarning(
  input: ProductSellabilityWarningInput,
): AdminProductErrorCode | null {
  if (input.status !== "active") {
    return null;
  }

  const hasSellableVariants = input.variants.some((variant) =>
    isVariantSellable(variant),
  );

  return hasSellableVariants
    ? null
    : ADMIN_PRODUCT_ERROR.productHasNoSellableVariants;
}

export function buildArchiveState(archivedAt: Date): ArchiveState {
  return {
    status: "archived",
    archivedAt,
  };
}
