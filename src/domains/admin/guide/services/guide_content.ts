import type { Dictionary } from "@/dictionary/services/get-dictionary";

export type GuideCopy = Dictionary["admin"]["guide"];
export type GuideArticle = GuideCopy["articles"][number];
type QueryValue = string | string[] | undefined;

export function readGuideQuery(params: Record<string, QueryValue>): {
  query: string;
  topic: string;
} {
  return {
    query: typeof params.q === "string" ? params.q.trim().slice(0, 120) : "",
    topic: typeof params.tema === "string" ? params.tema.slice(0, 60) : "",
  };
}

function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function searchGuideArticles(
  articles: GuideArticle[],
  query: string,
): GuideArticle[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  return articles.filter((article) => {
    const text = searchable(
      [
        article.title,
        article.summary,
        ...article.steps,
        ...article.notes,
        article.warning,
        article.example,
      ].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}

export function guideHref(topic: string): string {
  return "/admin/guia?" + new URLSearchParams({ tema: topic });
}

export function contextualGuideHref(pathname: string): string {
  if (pathname.startsWith("/admin/productos/") && pathname.endsWith("/preview"))
    return guideHref("publicacion");
  if (
    pathname === "/admin/productos" ||
    pathname.startsWith("/admin/productos/")
  )
    return guideHref("productos");
  if (pathname === "/admin/categorias") return guideHref("categorias");
  if (pathname === "/admin/pedidos" || pathname.startsWith("/admin/pedidos/"))
    return guideHref("pedidos");
  if (pathname === "/admin/usuarios" || pathname.startsWith("/admin/usuarios/"))
    return guideHref("usuarios");
  if (pathname === "/admin/analisis") return guideHref("analisis");
  if (pathname === "/admin/pendientes") return guideHref("dashboard");
  if (pathname === "/admin") return guideHref("dashboard");
  return "/admin/guia";
}
