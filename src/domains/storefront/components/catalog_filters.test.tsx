import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { catalogFilters } from "../services/catalog_filters";
import { CatalogMobileFilters, CatalogSortControl } from "./catalog_filters";
import { CatalogListing } from "./catalog_listing";

const filters = catalogFilters({
  q: "sábana",
  offers: true,
  available: true,
  minPriceCents: 0,
  sort: "price_asc",
});
const props = {
  dictionary,
  filters,
  categories: [],
  base: "/productos",
  scoped: false,
};
it("opens mobile filters as an accessible dialog, edits without submitting and closes", () => {
  render(<CatalogMobileFilters {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  const dialog = screen.getByRole("dialog", {
    name: dictionary.storefront.filters.title,
  });
  expect(
    within(dialog).getByLabelText(dictionary.storefront.filters.search),
  ).toHaveValue("sábana");
  expect(
    within(dialog).getByLabelText(dictionary.storefront.filters.available),
  ).toBeChecked();
  expect(
    within(dialog).getByLabelText(dictionary.storefront.filters.min),
  ).toHaveValue(0);
  expect(
    within(dialog).getByRole("link", {
      name: dictionary.storefront.filters.clear,
    }),
  ).toHaveAttribute("href", "/productos");
  fireEvent.click(
    within(dialog).getByRole("button", {
      name: dictionary.storefront.filters.close,
    }),
  );
});
it("keeps current search, offers and availability when changing order", () => {
  const { container } = render(<CatalogSortControl {...props} />);
  expect(container.querySelector("input[name=q]")).toHaveValue("sábana");
  expect(container.querySelector("input[name=ofertas]")).toHaveValue("1");
  expect(container.querySelector("input[name=disponibles]")).toHaveValue("1");
  expect(screen.getByLabelText(dictionary.storefront.filters.sort)).toHaveValue(
    "price_asc",
  );
  expect(container.querySelector("form")).toHaveAttribute("method", "get");
});
it("preserves every filter in paging links and provides a recoverable empty state", () => {
  render(
    <CatalogListing
      dictionary={dictionary}
      listing={{
        items: [],
        page: 1,
        pageCount: 2,
        total: 25,
        category: null,
        children: [],
        breadcrumbs: [],
        filters,
      }}
    />,
  );
  const next = new URL(
    screen
      .getByRole("link", { name: dictionary.storefront.next })
      .getAttribute("href") ?? "",
    "https://example.com",
  );
  expect(next.searchParams.get("q")).toBe("sábana");
  expect(next.searchParams.get("min")).toBe("0");
  expect(next.searchParams.get("orden")).toBe("price_asc");
  expect(next.searchParams.get("ofertas")).toBe("1");
  expect(next.searchParams.get("page")).toBe("2");
  expect(screen.getByRole("status")).toHaveTextContent(
    dictionary.storefront.filters.emptyTitle,
  );
});
