import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { GuideContent } from "./guide_content";

const c = dictionary.admin.guide;
it("starts with a real walkthrough and safe read-only links", () => {
  render(<GuideContent copy={c} query="" topic="" />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(c.title);
  const article = screen.getByRole("article");
  expect(within(article).getByRole("heading", { level: 2 })).toHaveTextContent(
    c.articles[0].title,
  );
  expect(
    within(article).getByRole("link", { name: c.articles[0].action }),
  ).toHaveAttribute("href", "/admin/productos");
  expect(within(article).getByText(c.articles[0].warning)).toBeVisible();
  expect(screen.getByRole("search")).toHaveAttribute("method", "get");
  expect(screen.getByRole("search")).toHaveAttribute("action", "/admin/guia");
});
it("shows selected topic, its steps and matching desktop/mobile navigation", () => {
  render(<GuideContent copy={c} query="" topic="pedidos" />);
  const article = c.articles.find((a) => a.id === "pedidos")!;
  expect(screen.getByRole("article")).toHaveTextContent(article.warning);
  expect(screen.getByRole("link", { name: article.title })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("combobox", { name: c.contents })).toHaveValue(
    "pedidos",
  );
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "imagenes" },
  });
  expect(screen.getByRole("combobox")).toHaveValue("imagenes");
  expect(
    screen.getByRole("button", { name: c.read }).closest("form"),
  ).toHaveAttribute("method", "get");
});
it("returns search results and removes the unrelated selected article", () => {
  render(<GuideContent copy={c} query="conteo físico" topic="pedidos" />);
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: c.searchLabel })).toHaveValue(
    "conteo físico",
  );
  expect(screen.getByRole("link", { name: c.clearSearch })).toHaveAttribute(
    "href",
    "/admin/guia",
  );
  const results = screen.getByRole("region", { name: c.resultsTitle });
  expect(
    within(results).getByRole("link", { name: /Registrar existencias/ }),
  ).toHaveAttribute("href", "/admin/guia?tema=inventario");
});
it("explains empty searches and unknown topics instead of inventing an article", () => {
  const view = render(<GuideContent copy={c} query="zzznada" topic="" />);
  expect(screen.getByText(c.emptyBody)).toBeVisible();
  view.rerender(<GuideContent copy={c} query="" topic="no-existe" />);
  expect(screen.getByText(c.unknownTitle)).toBeVisible();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});
