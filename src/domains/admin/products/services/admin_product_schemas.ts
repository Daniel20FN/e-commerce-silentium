import { z } from "zod";
import {
  ADMIN_PRODUCT_SORT_DIRECTION,
  ADMIN_PRODUCT_SORT_FIELD,
  ADMIN_PRODUCT_STATUS,
  ADMIN_PRODUCT_STATUS_VALUES,
  ADMIN_PRODUCT_UPSERT_STATUS_VALUES,
} from "../types/product_dto";

const ADMIN_PRODUCT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = ADMIN_PRODUCT_PAGE_SIZE_OPTIONS[0];
const slugSchema = z
  .string()
  .trim()
  .min(1, { error: "product_slug_required" })
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: "invalid_product_slug",
  });
const idSchema = z.string().trim().min(1).max(191);
const nullableTrimmedText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value ? value : null));
const booleanSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((value) => value === "true"),
]);

export const adminProductsListParamsSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) =>
        ADMIN_PRODUCT_PAGE_SIZE_OPTIONS.includes(value as 10 | 25 | 50),
      { error: "invalid_page_size" },
    )
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional().default(""),
  status: z
    .union([z.enum(ADMIN_PRODUCT_STATUS_VALUES), z.literal("all")])
    .default("all"),
  categoryId: idSchema.optional(),
  brand: z.string().trim().max(120).optional(),
  featured: booleanSchema.optional(),
  inTrash: booleanSchema.default(false),
  stock: z.enum(["all", "in_stock", "out_of_stock"]).optional(),
  discounted: booleanSchema.optional(),
  sortField: z
    .enum([
      ADMIN_PRODUCT_SORT_FIELD.name,
      ADMIN_PRODUCT_SORT_FIELD.status,
      ADMIN_PRODUCT_SORT_FIELD.brand,
      ADMIN_PRODUCT_SORT_FIELD.createdAt,
      ADMIN_PRODUCT_SORT_FIELD.updatedAt,
    ])
    .default(ADMIN_PRODUCT_SORT_FIELD.updatedAt),
  sortDirection: z
    .enum([ADMIN_PRODUCT_SORT_DIRECTION.asc, ADMIN_PRODUCT_SORT_DIRECTION.desc])
    .default(ADMIN_PRODUCT_SORT_DIRECTION.desc),
});

const productOptionValueSchema = z.object({
  id: idSchema.optional(),
  value: z
    .string()
    .trim()
    .min(1, { error: "product_option_value_required" })
    .max(120),
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
});

const productOptionSchema = z.object({
  id: idSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: "product_option_name_required" })
    .max(80),
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
  values: z.array(productOptionValueSchema).min(1).max(100),
});

export const adminProductUpsertSchema = z
  .object({
    name: z.string().trim().min(1, { error: "product_name_required" }).max(160),
    slug: slugSchema,
    shortDescription: nullableTrimmedText(280),
    longDescription: nullableTrimmedText(4000),
    brand: nullableTrimmedText(120),
    seoTitle: nullableTrimmedText(160),
    seoDescription: nullableTrimmedText(180),
    featured: booleanSchema.default(false),
    status: z
      .enum(ADMIN_PRODUCT_UPSERT_STATUS_VALUES)
      .default(ADMIN_PRODUCT_STATUS.draft),
    categoryIds: z.array(idSchema).min(1).max(25),
    primaryCategoryId: idSchema,
    options: z.array(productOptionSchema).max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.categoryIds).size !== value.categoryIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "product_category_duplicate",
        path: ["categoryIds"],
      });
    }
  });

export const adminProductLifecycleSchema = z.object({
  productId: idSchema,
});

export const adminVariantUpsertSchema = z
  .object({
    sku: z.string().trim().min(1, { error: "variant_sku_required" }).max(80),
    priceCents: z.coerce.number().int().min(0).max(999999999),
    compareAtPriceCents: z.coerce
      .number()
      .int()
      .min(0)
      .max(999999999)
      .nullable()
      .optional()
      .default(null),
    stock: z.coerce.number().int().min(0).max(999999999),
    active: booleanSchema.default(true),
    isDefault: booleanSchema.default(false),
    displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
    weightGrams: z.coerce
      .number()
      .int()
      .min(0)
      .max(999999999)
      .nullable()
      .optional()
      .default(null),
    widthMm: z.coerce
      .number()
      .int()
      .min(0)
      .max(999999999)
      .nullable()
      .optional()
      .default(null),
    heightMm: z.coerce
      .number()
      .int()
      .min(0)
      .max(999999999)
      .nullable()
      .optional()
      .default(null),
    lengthMm: z.coerce
      .number()
      .int()
      .min(0)
      .max(999999999)
      .nullable()
      .optional()
      .default(null),
    optionValueIds: z.array(idSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    if (
      value.compareAtPriceCents !== null &&
      value.compareAtPriceCents <= value.priceCents
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "variant_compare_at_price_invalid",
        path: ["compareAtPriceCents"],
      });
    }
  });

export const adminVariantGenerationPreviewSchema = z.object({
  optionIds: z.array(idSchema).min(1).max(10),
});

export const adminVariantGenerationConfirmSchema = z.object({
  variants: z.array(adminVariantUpsertSchema).min(1).max(500),
});

export const adminVariantLifecycleSchema = z.object({
  productId: idSchema,
  variantId: idSchema,
  action: z.enum(["trash", "restore"]),
});
