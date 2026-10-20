import {
  productWorkspaceHref,
  productsListViewUrl,
  readProductsListView,
  resolveWorkspaceSection,
  safeProductsReturnUrl,
} from "./product_workspace_links";

describe("workspace navigation contracts", () => {
  it("round-trips filters, pagination and sorting through a return URL", () => {
    const query = new URLSearchParams({
      page: "3",
      pageSize: "25",
      search: "Aurora & azul",
      status: "draft",
      categoryId: "cat-1",
      brand: "Silentium",
      featured: "yes",
      inTrash: "true",
      stock: "out_of_stock",
      discounted: "no",
      sortField: "name",
      sortDirection: "asc",
    });
    const view = readProductsListView(query);
    const returnTo = productsListViewUrl(view);
    expect(
      readProductsListView(
        new URL(returnTo, "https://workspace.invalid").searchParams,
      ),
    ).toEqual(view);
    const href = new URL(
      productWorkspaceHref("product-1", "media", returnTo),
      "https://workspace.invalid",
    );
    expect(href.searchParams.get("returnTo")).toBe(returnTo);
    expect(href.searchParams.get("section")).toBe("media");
  });
  it("does not accept external or arbitrary return targets", () => {
    for (const target of [
      "//evil.example",
      "https://evil.example/admin/productos",
      "/admin/usuarios",
      "javascript:alert(1)",
      "\\evil.example",
    ]) {
      expect(safeProductsReturnUrl(target)).toBe("/admin/productos");
    }
    expect(safeProductsReturnUrl("/admin/productos?search=one")).toBe(
      "/admin/productos?search=one",
    );
  });
  it("normalizes invalid state and sections instead of sending invalid requests", () => {
    const view = readProductsListView(
      new URLSearchParams(
        "page=-1&pageSize=999&status=invalid&sortField=bad&featured=true&stock=bad",
      ),
    );
    expect(view).toMatchObject({
      page: 0,
      pageSize: 10,
      status: "all",
      sortField: "updatedAt",
      featured: "all",
      stock: "all",
    });
    expect(resolveWorkspaceSection("invalid")).toBe("information");
    expect(resolveWorkspaceSection("costs")).toBe("costs");
    expect(resolveWorkspaceSection("inventory")).toBe("inventory");
  });
});
