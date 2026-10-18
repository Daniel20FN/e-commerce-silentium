import type { StorefrontCategory, StorefrontVariant } from "../types/catalog";
import {
  canSelectOptionValue,
  categoryTrail,
  descendantCategoryIds,
  initialVariant,
  normalizePage,
  realCompareAtPrice,
  resolveVariant,
  visibleCategories,
} from "./catalog_rules";
const category = (
  id: string,
  parentId: string | null = null,
): StorefrontCategory => ({
  id,
  parentId,
  slug: id,
  name: id,
  description: null,
  imageUrl: null,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
});
const variant = (
  id: string,
  ids: string[],
  stock = 2,
  isDefault = false,
): StorefrontVariant => ({
  id,
  optionValueIds: ids,
  stock,
  isDefault,
  priceCents: 10000,
  compareAtPriceCents: null,
  sku: id,
  images: [],
});
describe("public catalog rules", () => {
  it("hides inactive/deleted ancestor branches, cycles and orphan categories", () => {
    const records = [
      { ...category("active"), isActive: true, deletedAt: null },
      { ...category("hidden"), isActive: false, deletedAt: null },
      { ...category("child", "hidden"), isActive: true, deletedAt: null },
      { ...category("deleted"), isActive: true, deletedAt: new Date() },
      { ...category("orphan", "missing"), isActive: true, deletedAt: null },
      { ...category("cycle", "cycle"), isActive: true, deletedAt: null },
    ];
    expect(visibleCategories(records).map((c) => c.id)).toEqual(["active"]);
  });
  it("includes descendants once and orders breadcrumbs root first", () => {
    const cats = [
      category("root"),
      category("child", "root"),
      category("leaf", "child"),
      category("other"),
    ];
    expect(descendantCategoryIds("root", cats)).toEqual([
      "root",
      "child",
      "leaf",
    ]);
    expect(categoryTrail(cats[2], cats).map((c) => c.id)).toEqual([
      "root",
      "child",
      "leaf",
    ]);
  });
  it("prefers an available default, falls back to available, then preserves an exhausted default", () => {
    const exhausted = variant("default", [], 0, true),
      available = variant("available", []);
    expect(initialVariant([exhausted, available])?.id).toBe("available");
    expect(initialVariant([available, { ...exhausted, stock: 2 }])?.id).toBe(
      "default",
    );
    expect(initialVariant([exhausted])?.id).toBe("default");
    expect(initialVariant([])).toBeUndefined();
  });
  it("requires the exact complete combination, not merely the first partial match", () => {
    const variants = [
      variant("red-small", ["red", "small"]),
      variant("blue-large", ["blue", "large"], 0),
    ];
    expect(resolveVariant(variants, { color: "red" })).toBeNull();
    expect(resolveVariant(variants, { color: "red", size: "small" })?.id).toBe(
      "red-small",
    );
    expect(
      resolveVariant(variants, { color: "red", size: "large" }),
    ).toBeNull();
    expect(
      resolveVariant(variants, { color: "blue", size: "large" })?.stock,
    ).toBe(0);
  });
  it("disables impossible values while allowing exhausted but real combinations for inspection", () => {
    const variants = [
      variant("a", ["red", "small"]),
      variant("b", ["blue", "large"], 0),
    ];
    expect(
      canSelectOptionValue(
        variants,
        { color: "red", size: "small" },
        "color",
        "blue",
      ),
    ).toBe(false);
    expect(
      canSelectOptionValue(variants, { color: "blue" }, "size", "large"),
    ).toBe(true);
  });
  it("resolves the sole no-options variant", () => {
    expect(resolveVariant([variant("simple", [])], {})?.id).toBe("simple");
  });
  it.each([undefined, [], "0", "-1", "x", "1.5", "9999999"])(
    "normalizes invalid page input %s",
    (value) => {
      expect(normalizePage(value)).toBe(1);
    },
  );
  it("accepts bounded positive page integers", () =>
    expect(normalizePage("25")).toBe(25));
  it("only exposes a genuine compare-at discount", () => {
    expect(realCompareAtPrice(100, 150)).toBe(150);
    expect(realCompareAtPrice(100, 100)).toBeNull();
    expect(realCompareAtPrice(100, 50)).toBeNull();
    expect(realCompareAtPrice(0, null)).toBeNull();
  });
});
