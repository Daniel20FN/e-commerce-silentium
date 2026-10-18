import type { StorefrontCategory, StorefrontVariant } from "../types/catalog";

export const STOREFRONT_PAGE_SIZE = 24;

export function visibleCategories<
  T extends {
    id: string;
    parentId: string | null;
    isActive: boolean;
    deletedAt: Date | null;
  },
>(records: T[]): T[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return records.filter((record) => {
    let current: T | undefined = record;
    const seen = new Set<string>();
    while (current) {
      if (!current.isActive || current.deletedAt || seen.has(current.id))
        return false;
      seen.add(current.id);
      if (!current.parentId) return true;
      current = byId.get(current.parentId);
    }
    return false;
  });
}

export function categoryTrail(
  category: StorefrontCategory,
  categories: StorefrontCategory[],
): StorefrontCategory[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const trail: StorefrontCategory[] = [];
  const seen = new Set<string>();
  let current: StorefrontCategory | undefined = category;
  while (current && !seen.has(current.id)) {
    trail.unshift(current);
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}

export function descendantCategoryIds(
  categoryId: string,
  categories: StorefrontCategory[],
): string[] {
  const ids = new Set([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (
        category.parentId &&
        ids.has(category.parentId) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

export function initialVariant<T extends { isDefault: boolean; stock: number }>(
  variants: T[],
): T | undefined {
  return (
    variants.find((variant) => variant.isDefault && variant.stock > 0) ??
    variants.find((variant) => variant.stock > 0) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0]
  );
}

export function resolveVariant(
  variants: StorefrontVariant[],
  selected: Record<string, string>,
): StorefrontVariant | null {
  const ids = Object.values(selected);
  return (
    variants.find(
      (variant) =>
        ids.length === variant.optionValueIds.length &&
        ids.every((id) => variant.optionValueIds.includes(id)),
    ) ?? null
  );
}

export function canSelectOptionValue(
  variants: StorefrontVariant[],
  selected: Record<string, string>,
  optionId: string,
  valueId: string,
): boolean {
  const ids = Object.values({ ...selected, [optionId]: valueId }).filter(
    Boolean,
  );
  return variants.some((variant) =>
    ids.every((id) => variant.optionValueIds.includes(id)),
  );
}

export function realCompareAtPrice(
  price: number,
  compareAt: number | null,
): number | null {
  return compareAt !== null && compareAt > price ? compareAt : null;
}

export function normalizePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}
