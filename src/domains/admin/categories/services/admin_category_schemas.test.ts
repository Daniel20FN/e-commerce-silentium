import {
  adminCategoriesListParamsSchema,
  adminCategoryBulkActionSchema,
  adminCategoryCreateSchema,
  adminCategoryRestoreSchema,
  adminCategoryTrashSchema,
  adminCategoryUpdateSchema,
} from "./admin_category_schemas";

describe("admin_category_schemas", () => {
  it("parses combined list filters with defaults", () => {
    const result = adminCategoriesListParamsSchema.safeParse({
      page: "1",
      pageSize: "25",
      search: "  sabana premium  ",
      status: "active",
      hierarchy: "child",
      inTrash: true,
      parentId: "cat-parent-1",
      sortField: "name",
      sortDirection: "desc",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("Expected schema parse success for combined filters");
    }

    expect(result.data).toEqual({
      page: 1,
      pageSize: 25,
      search: "sabana premium",
      status: "active",
      hierarchy: "child",
      inTrash: true,
      parentId: "cat-parent-1",
      sortField: "name",
      sortDirection: "desc",
    });
  });

  it("rejects invalid list filters and invalid mutation payloads", () => {
    const invalidList = adminCategoriesListParamsSchema.safeParse({
      pageSize: 13,
      sortField: "unknown",
    });

    const invalidCreate = adminCategoryCreateSchema.safeParse({
      name: "",
      slug: "",
      sortOrder: -1,
      seoDescription: "x".repeat(170),
    });

    const invalidUpdate = adminCategoryUpdateSchema.safeParse({});

    const invalidTrash = adminCategoryTrashSchema.safeParse({
      categoryId: "",
    });

    const invalidRestore = adminCategoryRestoreSchema.safeParse({
      categoryId: "",
    });

    const invalidBulk = adminCategoryBulkActionSchema.safeParse({
      action: "archive",
      categoryIds: [],
    });

    expect(invalidList.success).toBe(false);
    expect(invalidCreate.success).toBe(false);
    expect(invalidUpdate.success).toBe(false);
    expect(invalidTrash.success).toBe(false);
    expect(invalidRestore.success).toBe(false);
    expect(invalidBulk.success).toBe(false);
  });
});
