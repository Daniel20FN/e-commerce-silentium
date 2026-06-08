export interface CategoryHierarchyNode {
  id: string;
  parentId: string | null;
}

interface AssertCategoryHierarchyParams {
  categoryId: string;
  nextParentId: string | null;
  hierarchy: readonly CategoryHierarchyNode[];
}

function createParentLookup(
  hierarchy: readonly CategoryHierarchyNode[],
): Map<string, string | null> {
  return new Map(hierarchy.map((node) => [node.id, node.parentId]));
}

export function assertCategoryHierarchy({
  categoryId,
  nextParentId,
  hierarchy,
}: AssertCategoryHierarchyParams): void {
  if (nextParentId === null) {
    return;
  }

  if (nextParentId === categoryId) {
    throw new Error("category_self_parent_not_allowed");
  }

  const parentByCategoryId = createParentLookup(hierarchy);
  let currentParentId: string | null | undefined = nextParentId;
  const visited = new Set<string>();

  while (currentParentId !== null && currentParentId !== undefined) {
    if (currentParentId === categoryId) {
      throw new Error("category_hierarchy_cycle_detected");
    }

    if (visited.has(currentParentId)) {
      throw new Error("category_hierarchy_cycle_detected");
    }

    visited.add(currentParentId);
    currentParentId = parentByCategoryId.get(currentParentId) ?? null;
  }
}
