import {
  activeCatalogFilters,
  catalogFilters,
  catalogQueryString,
  parseCatalogQuery,
} from "./catalog_filters";

describe("public catalog URL filters", () => {
  it("normalizes bounded search, COP prices and reverse ranges", () => {
    expect(
      parseCatalogQuery({
        q: "  sábana  ",
        min: "200000,25",
        max: "59900",
        orden: "price_desc",
        disponibles: "1",
        ofertas: "1",
        page: "2",
      }),
    ).toEqual({
      page: 2,
      q: "sábana",
      filterCategorySlug: "",
      minPriceCents: 5990000,
      maxPriceCents: 20000025,
      available: true,
      offers: true,
      sort: "price_desc",
    });
    expect(parseCatalogQuery({ min: "0" }).minPriceCents).toBe(0);
  });
  it("rejects malformed, repeated and overflowing values", () => {
    const result = parseCatalogQuery({
      q: ["one", "two"],
      min: "-1",
      max: "999999999999",
      categoria: ["hidden"],
      orden: "DROP TABLE",
      disponibles: ["1"],
      page: "-1",
    });
    expect(result).toMatchObject({
      page: 1,
      q: "",
      filterCategorySlug: "",
      minPriceCents: undefined,
      maxPriceCents: undefined,
      sort: "recommended",
      available: false,
    });
    expect(parseCatalogQuery({ q: "a".repeat(1000) }).q).toHaveLength(100);
  });
  it("round trips every filter through pagination and counts zero bounds", () => {
    const state = catalogFilters(
      parseCatalogQuery({
        q: "lino & algodón",
        min: "0",
        max: "150000",
        categoria: "sabanas",
        disponibles: "1",
        ofertas: "1",
        orden: "name_desc",
      }),
    );
    const query = catalogQueryString(state, 3);
    expect(query).toContain("q=lino+%26+algod%C3%B3n");
    expect(query).toContain("page=3");
    expect(
      catalogFilters(
        parseCatalogQuery(Object.fromEntries(new URLSearchParams(query))),
      ),
    ).toEqual(state);
    expect(activeCatalogFilters(state)).toBe(5);
    expect(catalogQueryString(catalogFilters({}), 1)).toBe("");
  });
});
