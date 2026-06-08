import {
  assertCategoryHierarchy,
  type CategoryHierarchyNode,
} from "./admin_category_hierarchy";

describe("admin_category_hierarchy", () => {
  it("rejects auto-parenting assignment", () => {
    const nodes: CategoryHierarchyNode[] = [
      {
        id: "cat-a",
        parentId: null,
      },
    ];

    expect(() =>
      assertCategoryHierarchy({
        categoryId: "cat-a",
        nextParentId: "cat-a",
        hierarchy: nodes,
      }),
    ).toThrow("category_self_parent_not_allowed");
  });

  it("rejects indirect cycles in hierarchy", () => {
    const nodes: CategoryHierarchyNode[] = [
      {
        id: "cat-a",
        parentId: null,
      },
      {
        id: "cat-b",
        parentId: "cat-a",
      },
      {
        id: "cat-c",
        parentId: "cat-b",
      },
    ];

    expect(() =>
      assertCategoryHierarchy({
        categoryId: "cat-a",
        nextParentId: "cat-c",
        hierarchy: nodes,
      }),
    ).toThrow("category_hierarchy_cycle_detected");
  });
});
