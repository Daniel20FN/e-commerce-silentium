import {
  ADMIN_CATEGORY_BULK_ACTION_VALUES,
  ADMIN_CATEGORY_HIERARCHY,
  ADMIN_CATEGORY_HIERARCHY_VALUES,
  ADMIN_CATEGORY_PAGE_SIZE_OPTIONS,
  ADMIN_CATEGORY_SORT_DIRECTION,
  ADMIN_CATEGORY_SORT_DIRECTION_VALUES,
  ADMIN_CATEGORY_SORT_FIELD,
  ADMIN_CATEGORY_SORT_FIELD_VALUES,
  ADMIN_CATEGORY_STATUS,
  ADMIN_CATEGORY_STATUS_VALUES,
} from "@/domains/admin/categories/types/shared";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = ADMIN_CATEGORY_PAGE_SIZE_OPTIONS[0];

export const adminCategoriesListParamsSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) =>
        ADMIN_CATEGORY_PAGE_SIZE_OPTIONS.includes(value as 10 | 25 | 50),
      {
        error: "invalid_page_size",
      },
    )
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional().default(""),
  status: z
    .enum(ADMIN_CATEGORY_STATUS_VALUES)
    .default(ADMIN_CATEGORY_STATUS.all),
  hierarchy: z
    .enum(ADMIN_CATEGORY_HIERARCHY_VALUES)
    .default(ADMIN_CATEGORY_HIERARCHY.all),
  inTrash: z.coerce.boolean().default(false),
  parentId: z.string().trim().min(1).max(191).optional(),
  sortField: z
    .enum(ADMIN_CATEGORY_SORT_FIELD_VALUES)
    .default(ADMIN_CATEGORY_SORT_FIELD.sortOrder),
  sortDirection: z
    .enum(ADMIN_CATEGORY_SORT_DIRECTION_VALUES)
    .default(ADMIN_CATEGORY_SORT_DIRECTION.asc),
});

const nullableTrimmedText = z
  .union([z.string().trim().max(280), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const adminCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "category_name_required" }).max(140),
  slug: z
    .string()
    .trim()
    .min(1, { error: "category_slug_required" })
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: "invalid_category_slug",
    }),
  description: nullableTrimmedText,
  imageUrl: z
    .union([z.url({ error: "invalid_category_image_url" }), z.null()])
    .optional()
    .transform((value) => value ?? null),
  parentId: z
    .union([z.string().trim().min(1).max(191), z.null()])
    .optional()
    .transform((value) => value ?? null),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.coerce.boolean().default(true),
  seoTitle: z
    .union([z.string().trim().max(160), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  seoDescription: z
    .union([z.string().trim().max(160), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

export const adminCategoryUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "category_name_required" })
      .max(140)
      .optional(),
    slug: z
      .string()
      .trim()
      .min(1, { error: "category_slug_required" })
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "invalid_category_slug",
      })
      .optional(),
    description: z.union([z.string().trim().max(280), z.null()]).optional(),
    imageUrl: z
      .union([z.url({ error: "invalid_category_image_url" }), z.null()])
      .optional(),
    parentId: z.union([z.string().trim().min(1).max(191), z.null()]).optional(),
    sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
    isActive: z.coerce.boolean().optional(),
    seoTitle: z.union([z.string().trim().max(160), z.null()]).optional(),
    seoDescription: z.union([z.string().trim().max(160), z.null()]).optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "admin_category_update_required",
      });
    }
  });

export const adminCategoryTrashSchema = z.object({
  categoryId: z.string().trim().min(1).max(191),
});

export const adminCategoryRestoreSchema = z.object({
  categoryId: z.string().trim().min(1).max(191),
});

export const adminCategoryBulkActionSchema = z.object({
  action: z.enum(ADMIN_CATEGORY_BULK_ACTION_VALUES),
  categoryIds: z.array(z.string().trim().min(1).max(191)).min(1).max(100),
});
