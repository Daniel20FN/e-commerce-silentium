import dictionary from "@/dictionary/es.json";
import {
  contextualGuideHref,
  guideHref,
  readGuideQuery,
  searchGuideArticles,
} from "./guide_content";

const articles = dictionary.admin.guide.articles;
it("documents archive limitations and reversible hiding without inventing an unarchive action", () => {
  const archive = articles.find((article) => article.id === "duplicar");
  expect(archive?.steps.join(" ")).toContain("Inactivo");
  expect(archive?.warning).toContain("no hay desarchivado");
});

it("normalizes bounded single query values and ignores repeated parameters", () => {
  expect(readGuideQuery({ q: ["stock", "precio"], tema: ["pedidos"] })).toEqual(
    { query: "", topic: "" },
  );
  expect(readGuideQuery({ q: "  FOTO  ", tema: "imagenes" })).toEqual({
    query: "FOTO",
    topic: "imagenes",
  });
  expect(readGuideQuery({ q: "a".repeat(200), tema: "a".repeat(100) })).toEqual(
    { query: "a".repeat(120), topic: "a".repeat(60) },
  );
});
it("searches full instructions case/accent-insensitively and requires every word", () => {
  expect(
    searchGuideArticles(articles, "IMAGENES").some((a) => a.id === "imagenes"),
  ).toBe(true);
  expect(
    searchGuideArticles(articles, "conteo físico").some(
      (a) => a.id === "inventario",
    ),
  ).toBe(true);
  expect(
    searchGuideArticles(articles, "beneficio neto").some(
      (a) => a.id === "costos",
    ),
  ).toBe(true);
  expect(searchGuideArticles(articles, "zzznada")).toEqual([]);
  expect(searchGuideArticles(articles, ".*")).toEqual([]);
});
it("keeps a complete, unique set of topics and valid related links", () => {
  const ids = articles.map((a) => a.id);
  expect(new Set(ids).size).toBe(articles.length);
  expect(ids).toEqual(
    expect.arrayContaining([
      "primeros-pasos",
      "categorias",
      "productos",
      "variantes",
      "imagenes",
      "publicacion",
      "duplicar",
      "precios",
      "inventario",
      "costos",
      "pedidos",
      "devoluciones",
      "dashboard",
      "analisis",
      "tienda",
      "usuarios",
      "problemas",
    ]),
  );
  for (const article of articles) {
    expect(article.steps.length).toBeGreaterThan(2);
    expect(article.warning).not.toBe("");
    expect(article.example).not.toBe("");
    expect([
      "/admin",
      "/admin/productos",
      "/admin/categorias",
      "/admin/pedidos",
      "/admin/analisis",
      "/admin/usuarios",
      "/",
    ]).toContain(article.href);
    article.related.forEach((id) => expect(ids).toContain(id));
  }
});
it.each([
  ["/admin", "dashboard"],
  ["/admin/productos/a", "productos"],
  ["/admin/productos/a/preview", "publicacion"],
  ["/admin/pedidos/nuevo", "pedidos"],
  ["/admin/categorias", "categorias"],
  ["/admin/usuarios/u", "usuarios"],
  ["/admin/analisis", "analisis"],
  ["/admin/pendientes", "dashboard"],
])("maps contextual help for %s", (path, topic) => {
  expect(contextualGuideHref(path)).toBe(guideHref(topic));
});
it("does not mistake lookalike paths for sections", () => {
  expect(contextualGuideHref("/admin/pedidos-extra")).toBe("/admin/guia");
  expect(contextualGuideHref("/admin/guia")).toBe("/admin/guia");
});
