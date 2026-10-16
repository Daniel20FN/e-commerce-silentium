export const ADMIN_PRODUCT_ERROR = {
  slugConflict: "product_slug_conflict",
  categoryRequired: "product_category_required",
  primaryCategoryInvalid: "product_primary_category_invalid",
  variantSkuConflict: "variant_sku_conflict",
  variantCombinationConflict: "variant_combination_conflict",
  variantOptionValueInvalid: "variant_option_value_invalid",
  variantOptionValueDuplicate: "variant_option_value_duplicate",
  compareAtPriceInvalid: "variant_compare_at_price_invalid",
  productHasNoSellableVariants: "product_has_no_sellable_variants",
  productOptionsLockedByVariants: "product_options_locked_by_variants",
} as const;

export type AdminProductErrorCode =
  (typeof ADMIN_PRODUCT_ERROR)[keyof typeof ADMIN_PRODUCT_ERROR];

export interface AdminProductRuleError extends Error {
  code: AdminProductErrorCode;
}

export function createAdminProductRuleError(
  code: AdminProductErrorCode,
): AdminProductRuleError {
  const error = new Error(code) as AdminProductRuleError;
  error.code = code;
  return error;
}
