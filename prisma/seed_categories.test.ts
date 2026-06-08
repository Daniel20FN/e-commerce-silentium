import {
  CATEGORY_SEED_DATA,
  sortCategorySeedByHierarchy,
} from "./seed_categories";

describe("category seed definitions", () => {
  it("defines minimal hierarchy with root and child categories", () => {
    expect(CATEGORY_SEED_DATA).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "ropa-de-cama",
          name: "Ropa de cama",
          parentSlug: null,
          sortOrder: 10,
        }),
        expect.objectContaining({
          slug: "sabana-ajustable",
          name: "Sábana ajustable",
          parentSlug: "ropa-de-cama",
          sortOrder: 20,
        }),
      ]),
    );
  });

  it("orders roots before children when sorting by hierarchy", () => {
    const sorted = sortCategorySeedByHierarchy([
      {
        slug: "hija",
        name: "Hija",
        parentSlug: "raiz",
        sortOrder: 20,
        isActive: true,
      },
      {
        slug: "raiz",
        name: "Raíz",
        parentSlug: null,
        sortOrder: 10,
        isActive: true,
      },
    ]);

    expect(sorted.map((category) => category.slug)).toEqual(["raiz", "hija"]);
  });
});
