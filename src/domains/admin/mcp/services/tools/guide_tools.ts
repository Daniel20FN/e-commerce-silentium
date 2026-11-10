import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  searchGuideArticles,
  type GuideArticle,
} from "@/domains/admin/guide/services/guide_content";
import { z } from "zod";
import { McpToolError } from "../mcp_errors";
import { defineReadTool } from "../mcp_tool_types";

/** Same bound the panel applies to the guide search box. */
const MAX_QUERY_LENGTH = 120;

function guideArticles(): GuideArticle[] {
  return getDictionary("es").admin.guide.articles;
}

function topicSummary(article: GuideArticle) {
  return { id: article.id, title: article.title, summary: article.summary };
}

/** Normalizes an id typed by an agent or a person: case and spaces only. */
function normalizeTopicId(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

/**
 * Read-only access to the admin user guide. The content is the dictionary
 * under `admin.guide` — the same articles the panel renders — so nothing is
 * duplicated here.
 */
export const guideTools = [
  defineReadTool({
    name: "guide_search",
    group: "guide",
    title: "Search the admin guide",
    description:
      "Searches the store admin guide (Spanish) by words, ignoring case and accents; every word must appear in the article. Returns matching topics as { id, title, summary }; read one in full with guide_get_topic. An empty query lists all topics. Use it to explain concepts and business rules to the user before acting.",
    inputSchema: z.object({
      query: z.string().trim().max(MAX_QUERY_LENGTH).default(""),
    }),
    handler: (input) => {
      const articles = guideArticles();
      const matches = input.query
        ? searchGuideArticles(articles, input.query)
        : articles;
      return Promise.resolve({
        query: input.query,
        total: matches.length,
        topics: matches.map(topicSummary),
      });
    },
  }),
  defineReadTool({
    name: "guide_get_topic",
    group: "guide",
    title: "Read a guide topic",
    description:
      "Returns one full admin guide article (Spanish): summary, steps, notes, a warning, an example, related topics and the admin panel path where it is done. Use a topic id from guide_search (for example primeros-pasos, productos, publicacion, inventario, pedidos).",
    inputSchema: z.object({ topic: z.string().trim().min(1).max(60) }),
    handler: (input) => {
      const articles = guideArticles();
      const id = normalizeTopicId(input.topic);
      const article = articles.find((entry) => entry.id === id);
      if (!article) throw new McpToolError("not_found", "unknown_guide_topic");
      return Promise.resolve({
        id: article.id,
        title: article.title,
        summary: article.summary,
        steps: article.steps,
        notes: article.notes,
        warning: article.warning,
        example: article.example,
        panelPath: article.href,
        related: article.related.flatMap((relatedId) => {
          const related = articles.find((entry) => entry.id === relatedId);
          return related ? [{ id: related.id, title: related.title }] : [];
        }),
      });
    },
  }),
];
