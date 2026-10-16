import {
  ADMIN_PRODUCT_STATUS,
  ADMIN_PRODUCT_UPSERT_STATUS,
} from "../types/product_dto";
import {
  adminProductLifecycleSchema,
  adminProductUpsertSchema,
  adminProductsListParamsSchema,
  adminVariantGenerationConfirmSchema,
  adminVariantGenerationPreviewSchema,
  adminVariantUpsertSchema,
} from "./admin_product_schemas";

const VALID_PRODUCT_UPSERT = {
  name: "  Sábana premium  ",
  slug: "sabana-premium",
  shortDescription: "  Algodón suave  ",
  longDescription: null,
  brand: "  Silentium  ",
  seoTitle: null,
  seoDescription: "  Descanso premium  ",
  featured: "true",
  status: ADMIN_PRODUCT_UPSERT_STATUS.active,
  categoryIds: ["cat-bedding", "cat-sheets"],
  primaryCategoryId: "cat-sheets",
  options: [
    {
      name: "  Color  ",
      displayOrder: "1",
      values: [{ value: "  Blanco  ", displayOrder: "0" }],
    },
  ],
};

describe("admin_product_schemas", () => {
  it("parses list filters, product upsert, and lifecycle actions", () => {
    expect(
      adminProductsListParamsSchema.parse({
        page: "2",
        pageSize: "25",
        search: " sabana queen ",
        status: ADMIN_PRODUCT_STATUS.active,
        categoryId: "cat-bedding",
        brand: " Silentium ",
        featured: "true",
        inTrash: "false",
        sortField: "updatedAt",
        sortDirection: "desc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 25,
      search: "sabana queen",
      status: "active",
      categoryId: "cat-bedding",
      brand: "Silentium",
      featured: true,
      inTrash: false,
      sortField: "updatedAt",
      sortDirection: "desc",
    });

    expect(adminProductUpsertSchema.parse(VALID_PRODUCT_UPSERT)).toEqual({
      name: "Sábana premium",
      slug: "sabana-premium",
      shortDescription: "Algodón suave",
      longDescription: null,
      brand: "Silentium",
      seoTitle: null,
      seoDescription: "Descanso premium",
      featured: true,
      status: "active",
      categoryIds: ["cat-bedding", "cat-sheets"],
      primaryCategoryId: "cat-sheets",
      options: [
        {
          name: "Color",
          displayOrder: 1,
          values: [{ value: "Blanco", displayOrder: 0 }],
        },
      ],
    });

    expect(
      adminProductLifecycleSchema.parse({ productId: " product-1 " }),
    ).toEqual({ productId: "product-1" });
  });

  it("rejects archived product upserts and invalid variant/generation payloads", () => {
    expect(
      adminProductUpsertSchema.safeParse({
        ...VALID_PRODUCT_UPSERT,
        status: ADMIN_PRODUCT_STATUS.archived,
      }).success,
    ).toBe(false);

    expect(
      adminVariantUpsertSchema.safeParse({
        sku: "SLT-SABANA-Q",
        priceCents: 5000,
        compareAtPriceCents: 5000,
        stock: 0,
        active: true,
        isDefault: false,
        displayOrder: 0,
        optionValueIds: ["value-white"],
      }).success,
    ).toBe(false);

    expect(
      adminVariantGenerationPreviewSchema.safeParse({ optionIds: [] }).success,
    ).toBe(false);

    expect(
      adminVariantGenerationConfirmSchema.safeParse({ variants: [] }).success,
    ).toBe(false);
  });

  it("rejects duplicate product category ids before Prisma receives them", () => {
    const result = adminProductUpsertSchema.safeParse({
      ...VALID_PRODUCT_UPSERT,
      categoryIds: ["cat-sheets", "cat-sheets"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts only booleans and explicit true or false strings", () => {
    expect(
      adminProductsListParamsSchema.safeParse({ featured: "0" }).success,
    ).toBe(false);
    expect(
      adminProductsListParamsSchema.safeParse({ inTrash: "no" }).success,
    ).toBe(false);
    expect(
      adminProductUpsertSchema.safeParse({
        ...VALID_PRODUCT_UPSERT,
        featured: "anything",
      }).success,
    ).toBe(false);
    expect(
      adminVariantUpsertSchema.safeParse({
        sku: "SLT-SABANA-Q",
        priceCents: 5000,
        compareAtPriceCents: 6000,
        stock: 1,
        active: "true",
        isDefault: false,
        displayOrder: 0,
        optionValueIds: ["value-white"],
      }).success,
    ).toBe(true);
    expect(
      adminVariantUpsertSchema.safeParse({
        sku: "SLT-SABANA-Q",
        priceCents: 5000,
        compareAtPriceCents: 6000,
        stock: 1,
        active: "false",
        isDefault: "anything",
        displayOrder: 0,
        optionValueIds: ["value-white"],
      }).success,
    ).toBe(false);
  });
});
