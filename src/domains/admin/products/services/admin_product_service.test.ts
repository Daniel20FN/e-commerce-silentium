import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ADMIN_PRODUCT_STATUS,
  ADMIN_PRODUCT_UPSERT_STATUS_VALUES,
} from "../types/product_dto";
import { ADMIN_PRODUCT_ERROR } from "../types/product_errors";
import {
  assertCompareAtPrice,
  assertProductCategories,
  assertProductSlugAvailable,
  assertVariantCombinationAvailable,
  assertVariantSkuAvailable,
  buildArchiveState,
  buildOptionCombinationKey,
  buildValidatedOptionCombinationKey,
  getProductSellabilityWarning,
  isVariantSellable,
} from "./admin_product_rules";

const ACTIVE_CATEGORY_IDS = ["cat-bedding", "cat-sheets"];

describe("admin product domain rules", () => {
  it("rejects duplicated slugs unless the match is the current product", () => {
    expect(() =>
      assertProductSlugAvailable({
        slug: "sabana-premium",
        existingProductId: "product-existing",
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.slugConflict);

    expect(() =>
      assertProductSlugAvailable({
        slug: "sabana-premium",
        existingProductId: "product-current",
        currentProductId: "product-current",
      }),
    ).not.toThrow();
  });

  it("requires categories for draft creation as the stricter project rule", () => {
    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.draft,
        categoryIds: [],
        primaryCategoryId: null,
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.categoryRequired);
  });

  it("requires at least one active non-deleted category for active products", () => {
    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-inactive"],
        primaryCategoryId: "cat-inactive",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.categoryRequired);

    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-deleted"],
        primaryCategoryId: "cat-deleted",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.categoryRequired);
  });

  it("requires the primary category to belong to active associated categories", () => {
    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-bedding", "cat-sheets"],
        primaryCategoryId: "cat-pillows",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.primaryCategoryInvalid);

    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-bedding", "cat-inactive"],
        primaryCategoryId: "cat-inactive",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.primaryCategoryInvalid);

    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-bedding", "cat-deleted"],
        primaryCategoryId: "cat-deleted",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.primaryCategoryInvalid);

    expect(() =>
      assertProductCategories({
        status: ADMIN_PRODUCT_STATUS.active,
        categoryIds: ["cat-bedding", "cat-sheets"],
        primaryCategoryId: "cat-sheets",
        activeCategoryIds: ACTIVE_CATEGORY_IDS,
      }),
    ).not.toThrow();
  });

  it("keeps primary category uniqueness enforced at the database migration boundary", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20260609223000_catalog_products_variants/migration.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ProductCategory_one_primary_per_product_idx" ON "ProductCategory"("productId") WHERE "isPrimary" = true;',
    );
  });

  it("keeps default variant uniqueness enforced at the database migration boundary", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20260609223000_catalog_products_variants/migration.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ProductVariant_one_default_per_product_idx" ON "ProductVariant"("productId") WHERE "isDefault" = true AND "deletedAt" IS NULL;',
    );
  });

  it("rejects duplicated variant SKUs unless the match is the current variant", () => {
    expect(() =>
      assertVariantSkuAvailable({
        sku: "SLT-SABANA-BLANCA-Q",
        existingVariantId: "variant-existing",
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantSkuConflict);

    expect(() =>
      assertVariantSkuAvailable({
        sku: "SLT-SABANA-BLANCA-Q",
        existingVariantId: "variant-current",
        currentVariantId: "variant-current",
      }),
    ).not.toThrow();
  });

  it("validates option values belong to the product before building the combination key", () => {
    expect(
      buildValidatedOptionCombinationKey({
        productId: "product-current",
        optionValueIds: ["value-white", "value-queen"],
        optionValues: [
          {
            id: "value-white",
            productId: "product-current",
            optionId: "option-color",
          },
          {
            id: "value-queen",
            productId: "product-current",
            optionId: "option-size",
          },
        ],
      }),
    ).toBe("value-queen:value-white");

    expect(() =>
      buildValidatedOptionCombinationKey({
        productId: "product-current",
        optionValueIds: ["value-white", "value-foreign"],
        optionValues: [
          {
            id: "value-white",
            productId: "product-current",
            optionId: "option-color",
          },
          {
            id: "value-foreign",
            productId: "product-other",
            optionId: "option-color",
          },
        ],
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantOptionValueInvalid);
  });

  it("rejects duplicated option values before building variant combinations", () => {
    expect(() =>
      buildValidatedOptionCombinationKey({
        productId: "product-current",
        optionValueIds: ["value-white", "value-white"],
        optionValues: [
          {
            id: "value-white",
            productId: "product-current",
            optionId: "option-color",
          },
        ],
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantOptionValueDuplicate);
  });

  it("rejects selecting more than one value from the same product option", () => {
    expect(() =>
      buildValidatedOptionCombinationKey({
        productId: "product-current",
        optionValueIds: ["value-white", "value-blue"],
        optionValues: [
          {
            id: "value-white",
            productId: "product-current",
            optionId: "option-color",
          },
          {
            id: "value-blue",
            productId: "product-current",
            optionId: "option-color",
          },
        ],
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantOptionValueDuplicate);
  });

  it("normalizes option combinations and rejects duplicate combinations", () => {
    const combinationKey = buildOptionCombinationKey([
      "value-queen",
      "value-white",
    ]);

    expect(combinationKey).toBe("value-queen:value-white");
    expect(buildOptionCombinationKey(["value-white", "value-queen"])).toBe(
      combinationKey,
    );

    expect(() =>
      assertVariantCombinationAvailable({
        productId: "product-current",
        optionValueIds: ["value-white", "value-queen"],
        optionValues: [
          {
            id: "value-white",
            productId: "product-current",
            optionId: "option-color",
          },
          {
            id: "value-queen",
            productId: "product-current",
            optionId: "option-size",
          },
        ],
        existingCombinationKeys: [combinationKey],
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantCombinationConflict);
  });

  it("rejects variant combinations with option values from another product", () => {
    expect(() =>
      assertVariantCombinationAvailable({
        productId: "product-current",
        optionValueIds: ["value-current", "value-foreign"],
        optionValues: [
          {
            id: "value-current",
            productId: "product-current",
            optionId: "option-color",
          },
          {
            id: "value-foreign",
            productId: "product-other",
            optionId: "option-color",
          },
        ],
        existingCombinationKeys: [],
      }),
    ).toThrow(ADMIN_PRODUCT_ERROR.variantOptionValueInvalid);
  });

  it("requires compare-at price to be greater than price when present", () => {
    expect(() =>
      assertCompareAtPrice({ priceCents: 5000, compareAtPriceCents: 5000 }),
    ).toThrow(ADMIN_PRODUCT_ERROR.compareAtPriceInvalid);

    expect(() =>
      assertCompareAtPrice({ priceCents: 5000, compareAtPriceCents: 7000 }),
    ).not.toThrow();
    expect(() =>
      assertCompareAtPrice({ priceCents: 5000, compareAtPriceCents: null }),
    ).not.toThrow();
  });

  it("keeps stock-0 and deleted variants visible to admin but not sellable", () => {
    expect(isVariantSellable({ active: true, deletedAt: null, stock: 0 })).toBe(
      false,
    );
    expect(
      isVariantSellable({
        active: true,
        deletedAt: new Date("2026-06-09T21:00:00.000Z"),
        stock: 4,
      }),
    ).toBe(false);
    expect(isVariantSellable({ active: true, deletedAt: null, stock: 4 })).toBe(
      true,
    );
  });

  it("warns when an active product has no sellable variants", () => {
    expect(
      getProductSellabilityWarning({
        status: "active",
        variants: [
          { active: true, deletedAt: null, stock: 0 },
          { active: false, deletedAt: null, stock: 8 },
        ],
      }),
    ).toBe(ADMIN_PRODUCT_ERROR.productHasNoSellableVariants);

    expect(
      getProductSellabilityWarning({
        status: "active",
        variants: [{ active: true, deletedAt: null, stock: 8 }],
      }),
    ).toBeNull();
  });

  it("sets archived status and archivedAt together", () => {
    const archivedAt = new Date("2026-06-09T20:00:00.000Z");

    expect(buildArchiveState(archivedAt)).toEqual({
      status: "archived",
      archivedAt,
    });
  });

  it("keeps archived status out of product upsert contracts", () => {
    expect(ADMIN_PRODUCT_UPSERT_STATUS_VALUES).toEqual([
      ADMIN_PRODUCT_STATUS.draft,
      ADMIN_PRODUCT_STATUS.active,
      ADMIN_PRODUCT_STATUS.inactive,
    ]);
    expect(ADMIN_PRODUCT_UPSERT_STATUS_VALUES).not.toContain(
      ADMIN_PRODUCT_STATUS.archived,
    );
  });
});
