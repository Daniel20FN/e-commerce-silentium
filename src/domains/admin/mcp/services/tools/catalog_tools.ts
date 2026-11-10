import {
  applyAdminCategoryBulkAction,
  createAdminCategory,
  restoreAdminCategory,
  trashAdminCategory,
  updateAdminCategory,
} from "@/domains/admin/categories/services/admin_category_mutations";
import {
  listAdminCategories,
  listAdminCategoryParentOptions,
} from "@/domains/admin/categories/services/admin_category_queries";
import {
  adminCategoriesListParamsSchema,
  adminCategoryBulkActionSchema,
  adminCategoryCreateSchema,
  adminCategoryUpdateSchema,
} from "@/domains/admin/categories/services/admin_category_schemas";
import {
  costIdSchema,
  costInputSchema,
  costUpdateSchema,
} from "@/domains/admin/costs/services/cost_schemas";
import {
  changeCatalogCostState,
  createCatalogCost,
  getCatalogCosts,
  updateCatalogCost,
} from "@/domains/admin/costs/services/cost_service";
import {
  adminProductLifecycleSchema,
  adminProductsListParamsSchema,
  adminProductUpsertSchema,
  adminVariantGenerationConfirmSchema,
  adminVariantGenerationPreviewSchema,
  adminVariantUpsertSchema,
} from "@/domains/admin/products/services/admin_product_schemas";
import {
  createAdminProduct,
  getAdminProductDetail,
  listAdminProducts,
  updateAdminProduct,
} from "@/domains/admin/products/services/admin_product_service";
import {
  confirmAdminVariantGeneration,
  previewAdminVariantGeneration,
} from "@/domains/admin/products/services/admin_variant_generation_service";
import {
  createAdminVariant,
  listAdminProductVariants,
  restoreAdminVariant,
  softDeleteAdminVariant,
  updateAdminVariant,
} from "@/domains/admin/products/services/admin_variant_service";
import {
  duplicateProductSchema,
  priceBatchSchema,
} from "@/domains/admin/products/services/catalog_operation_schemas";
import { duplicateProduct } from "@/domains/admin/products/services/duplicate_product_service";
import { updatePriceBatch } from "@/domains/admin/products/services/price_batch_service";
import { z } from "zod";
import { defineReadTool, defineWriteTool } from "../mcp_tool_types";

const productId = adminProductLifecycleSchema.shape.productId;
const entityId = z.string().trim().min(1).max(191);

const productInput = z.object({ productId });
const updateProductInput = z
  .object({ productId, product: adminProductUpsertSchema })
  .refine((value) => value.product.expectedUpdatedAt !== undefined, {
    message: "revision_required",
    path: ["product", "expectedUpdatedAt"],
  });
const createVariantInput = z.object({
  productId,
  variant: adminVariantUpsertSchema,
});
const updateVariantInput = z
  .object({ productId, variantId: entityId, variant: adminVariantUpsertSchema })
  .refine((value) => value.variant.expectedUpdatedAt !== undefined, {
    message: "revision_required",
    path: ["variant", "expectedUpdatedAt"],
  });
const variantRefInput = z.object({ productId, variantId: entityId });
const costRefInput = z.object({
  productId,
  id: costIdSchema,
  revision: z.string().datetime(),
});

export const catalogTools = [
  defineReadTool({
    name: "catalog_list_products",
    group: "catalog",
    title: "List products",
    description:
      "Lists catalog products with filters (search, status, category, stock, trash), sorting and pagination (page is zero-based; pageSize 10, 25 or 50).",
    inputSchema: adminProductsListParamsSchema,
    handler: (input) => listAdminProducts(input),
  }),
  defineReadTool({
    name: "catalog_get_product",
    group: "catalog",
    title: "Get product",
    description:
      "Returns one product with options, categories and its updatedAt revision, needed by update and publication tools.",
    inputSchema: productInput,
    handler: (input) => getAdminProductDetail(input.productId),
  }),
  defineWriteTool({
    name: "catalog_create_product",
    group: "catalog",
    title: "Create draft product",
    description:
      "Creates a product. It is always created as a draft, whatever status is sent; use the publication tools to publish it.",
    destructive: false,
    inputSchema: z.object({ product: adminProductUpsertSchema }),
    handler: (input) =>
      createAdminProduct({ ...input.product, status: "draft" }),
  }),
  defineWriteTool({
    name: "catalog_update_product",
    group: "catalog",
    title: "Update product",
    description:
      "Updates product information. product.expectedUpdatedAt (the revision read from catalog_get_product) is required; a stale revision returns a conflict error. The status field is ignored: the current status is kept, use the publication tools to change it.",
    destructive: false,
    idempotent: true,
    inputSchema: updateProductInput,
    handler: async (input) => {
      const current = await getAdminProductDetail(input.productId);
      return updateAdminProduct(input.productId, {
        ...input.product,
        status: current.status === "archived" ? "inactive" : current.status,
      });
    },
  }),
  defineWriteTool({
    name: "catalog_duplicate_product",
    group: "catalog",
    title: "Duplicate product",
    description:
      "Creates an independent draft copy of a product. operationId (uuid) makes the call idempotent; expectedUpdatedAt is the source revision.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, options: duplicateProductSchema }),
    handler: (input, { actor }) =>
      duplicateProduct(input.productId, input.options, actor),
  }),
  defineReadTool({
    name: "catalog_list_variants",
    group: "catalog",
    title: "List variants",
    description:
      "Lists the variants of a product (SKU, price, stock, options, updatedAt revision). Set includeTrash to list soft-deleted variants.",
    inputSchema: z.object({ productId, includeTrash: z.boolean().optional() }),
    handler: (input) =>
      listAdminProductVariants({
        productId: input.productId,
        includeTrash: input.includeTrash,
      }),
  }),
  defineWriteTool({
    name: "catalog_create_variant",
    group: "catalog",
    title: "Create variant",
    description:
      "Creates a variant of a product. Initial stock is recorded in the immutable inventory ledger under the authenticated user.",
    destructive: false,
    inputSchema: createVariantInput,
    handler: (input, { actor }) =>
      createAdminVariant(input.productId, input.variant, undefined, actor),
  }),
  defineWriteTool({
    name: "catalog_update_variant",
    group: "catalog",
    title: "Update variant",
    description:
      "Updates a variant. variant.expectedUpdatedAt (revision from catalog_list_variants) is required. Stock changes must go through the inventory tools.",
    destructive: false,
    idempotent: true,
    inputSchema: updateVariantInput,
    handler: (input) =>
      updateAdminVariant(input.productId, input.variantId, input.variant),
  }),
  defineWriteTool({
    name: "catalog_delete_variant",
    group: "catalog",
    title: "Delete variant (soft)",
    description:
      "Moves a variant to the trash (soft delete). It can be restored with catalog_restore_variant.",
    destructive: true,
    idempotent: true,
    inputSchema: variantRefInput,
    handler: (input) =>
      softDeleteAdminVariant(input.productId, input.variantId),
  }),
  defineWriteTool({
    name: "catalog_restore_variant",
    group: "catalog",
    title: "Restore variant",
    description: "Restores a soft-deleted variant.",
    destructive: false,
    idempotent: true,
    inputSchema: variantRefInput,
    handler: (input) => restoreAdminVariant(input.productId, input.variantId),
  }),
  defineReadTool({
    name: "catalog_preview_variant_generation",
    group: "catalog",
    title: "Preview variant generation",
    description:
      "Previews the option-value combinations that catalog_confirm_variant_generation would create. Writes nothing.",
    inputSchema: z.object({
      productId,
      generation: adminVariantGenerationPreviewSchema,
    }),
    handler: (input) =>
      previewAdminVariantGeneration(input.productId, input.generation),
  }),
  defineWriteTool({
    name: "catalog_confirm_variant_generation",
    group: "catalog",
    title: "Generate variants",
    description:
      "Creates the given variants in one batch (up to 500); duplicate combinations are skipped.",
    destructive: false,
    inputSchema: z.object({
      productId,
      generation: adminVariantGenerationConfirmSchema,
    }),
    handler: (input, { actor }) =>
      confirmAdminVariantGeneration(input.productId, input.generation, actor),
  }),
  defineWriteTool({
    name: "catalog_update_prices",
    group: "catalog",
    title: "Update prices in batch",
    description:
      "Updates price and compare-at price of up to 50 variants atomically. Each row needs the variant updatedAt revision and expectedProductUpdatedAt is the product revision; prices are in cents.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, prices: priceBatchSchema }),
    handler: (input) => updatePriceBatch(input.productId, input.prices),
  }),
  defineReadTool({
    name: "catalog_get_costs",
    group: "catalog",
    title: "Get costs",
    description:
      "Returns the private costs of a product and its variants (cents), with their revision and the per-unit summary.",
    inputSchema: productInput,
    handler: (input) => getCatalogCosts(input.productId),
  }),
  defineWriteTool({
    name: "catalog_create_cost",
    group: "catalog",
    title: "Create cost",
    description:
      "Registers a private cost (amount in cents) for the product or one of its variants (variantId null = whole product).",
    destructive: false,
    inputSchema: z.object({ productId, cost: costInputSchema }),
    handler: (input) => createCatalogCost(input.productId, input.cost),
  }),
  defineWriteTool({
    name: "catalog_update_cost",
    group: "catalog",
    title: "Update cost",
    description:
      "Updates a cost. cost.revision (ISO timestamp from catalog_get_costs) is required.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ productId, cost: costUpdateSchema }),
    handler: (input) => updateCatalogCost(input.productId, input.cost),
  }),
  defineWriteTool({
    name: "catalog_trash_cost",
    group: "catalog",
    title: "Trash cost",
    description: "Moves a cost to the trash. Restorable.",
    destructive: true,
    idempotent: true,
    inputSchema: costRefInput,
    handler: (input) =>
      changeCatalogCostState(input.productId, {
        id: input.id,
        revision: input.revision,
        action: "trash",
      }),
  }),
  defineWriteTool({
    name: "catalog_restore_cost",
    group: "catalog",
    title: "Restore cost",
    description: "Restores a trashed cost.",
    destructive: false,
    idempotent: true,
    inputSchema: costRefInput,
    handler: (input) =>
      changeCatalogCostState(input.productId, {
        id: input.id,
        revision: input.revision,
        action: "restore",
      }),
  }),
  defineReadTool({
    name: "catalog_list_categories",
    group: "catalog",
    title: "List categories",
    description:
      "Lists categories with filters (search, status, hierarchy, trash), sorting and pagination (zero-based page; pageSize 10, 25 or 50).",
    inputSchema: adminCategoriesListParamsSchema,
    handler: (input) => listAdminCategories(input),
  }),
  defineReadTool({
    name: "catalog_category_parent_options",
    group: "catalog",
    title: "List category parent options",
    description: "Lists the active categories that can be used as a parent.",
    inputSchema: z.object({}),
    handler: () => listAdminCategoryParentOptions(),
  }),
  defineWriteTool({
    name: "catalog_create_category",
    group: "catalog",
    title: "Create category",
    description: "Creates a category.",
    destructive: false,
    inputSchema: z.object({ category: adminCategoryCreateSchema }),
    handler: (input) => createAdminCategory(input.category),
  }),
  defineWriteTool({
    name: "catalog_update_category",
    group: "catalog",
    title: "Update category",
    description:
      "Partially updates a category; at least one field must be provided.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({
      categoryId: entityId,
      category: adminCategoryUpdateSchema,
    }),
    handler: (input) => updateAdminCategory(input.categoryId, input.category),
  }),
  defineWriteTool({
    name: "catalog_trash_category",
    group: "catalog",
    title: "Trash category",
    description:
      "Moves a category to the trash. It can affect the storefront visibility of its products; restorable.",
    destructive: true,
    idempotent: true,
    inputSchema: z.object({ categoryId: entityId }),
    handler: (input) => trashAdminCategory(input.categoryId),
  }),
  defineWriteTool({
    name: "catalog_restore_category",
    group: "catalog",
    title: "Restore category",
    description: "Restores a trashed category.",
    destructive: false,
    idempotent: true,
    inputSchema: z.object({ categoryId: entityId }),
    handler: (input) => restoreAdminCategory(input.categoryId),
  }),
  defineWriteTool({
    name: "catalog_bulk_categories",
    group: "catalog",
    title: "Bulk category action",
    description:
      "Applies activate, deactivate or trash to up to 100 categories; reports per-category exceptions.",
    destructive: true,
    inputSchema: z.object({ bulk: adminCategoryBulkActionSchema }),
    handler: (input) => applyAdminCategoryBulkAction(input.bulk),
  }),
];
