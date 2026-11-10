import { getDictionary } from "@/dictionary/services/get-dictionary";
import { getPriorityBlock } from "@/domains/admin/home/services/operational_service";
import type {
  PriorityBlock,
  PriorityGroup,
  PriorityQueue,
} from "@/domains/admin/home/types/operational";
import { z } from "zod";
import { defineReadTool } from "../mcp_tool_types";

const OVERVIEW_BLOCKS = [
  "orders",
  "inventory",
  "catalog",
] as const satisfies readonly PriorityBlock[];

/** Guide topic that explains how to handle each priority group. */
const GROUP_GUIDE_TOPIC: Record<PriorityGroup, string> = {
  drafts: "productos",
  publication: "publicacion",
  unavailable: "inventario",
  out: "inventario",
  low: "inventario",
  prepare: "pedidos",
  deliver: "pedidos",
  unpaid: "pedidos",
};
const GROUP_ORDER: readonly PriorityGroup[] = [
  "prepare",
  "deliver",
  "unpaid",
  "out",
  "low",
  "unavailable",
  "publication",
  "drafts",
];
/** Shown when nothing is pending, so a newcomer still has somewhere to start. */
const STARTER_TOPICS = ["primeros-pasos", "dashboard"];

function guideTitle(id: string): string {
  return (
    getDictionary("es").admin.guide.articles.find((entry) => entry.id === id)
      ?.title ?? id
  );
}

function sectionOf(queue: PriorityQueue) {
  return {
    count: queue.count,
    // The panel's own preview rows: names, SKUs and stock, never costs or
    // customer data.
    sample: queue.rows.map((row) => ({
      name: row.name || null,
      sku: row.sku,
      stock: row.stock,
      minimum: row.minimum,
      orderNumber: row.orderNumber,
    })),
  };
}

/**
 * Starting point for a conversation: who the token owner is, what the token
 * can do and how the store looks right now, reusing the admin home queues.
 */
export const storeTools = [
  defineReadTool({
    name: "store_overview",
    group: "store",
    title: "Store overview",
    description:
      "Call this first. Returns who you are acting as (display name and role), the token scopes and expiry, and a short summary of the store from the admin home priorities: pending orders (prepare, deliver, unpaid), stock (out, low), and catalog (drafts, products not public, public products without stock) with counts and a few sample rows, plus suggested guide topics (read them with guide_get_topic). It never returns costs, customer data, other users or credentials.",
    inputSchema: z.object({}),
    handler: async (_input, context) => {
      const settled = await Promise.allSettled(
        OVERVIEW_BLOCKS.map((block) => getPriorityBlock(block)),
      );
      const summary: Partial<
        Record<PriorityGroup, ReturnType<typeof sectionOf>>
      > = {};
      const unavailable: PriorityBlock[] = [];
      settled.forEach((result, index) => {
        if (result.status === "rejected") {
          unavailable.push(OVERVIEW_BLOCKS[index]);
          return;
        }
        for (const queue of result.value)
          summary[queue.group] = sectionOf(queue);
      });

      const pending = GROUP_ORDER.flatMap((group) => {
        const count = summary[group]?.count ?? 0;
        return count > 0
          ? [{ group, count, guideTopic: GROUP_GUIDE_TOPIC[group] }]
          : [];
      });
      const topicIds = [
        ...new Set(
          pending.length > 0
            ? pending.map((entry) => entry.guideTopic)
            : STARTER_TOPICS,
        ),
      ];

      return {
        owner: {
          displayName: context.session.label,
          role: context.session.role,
        },
        token: {
          scopes: context.session.scopes,
          canWrite: context.session.scopes.includes("write"),
          expiresAt: context.session.expiresAt.toISOString(),
        },
        store: { summary, unavailable },
        suggestedNextSteps: {
          attention: pending,
          guideTopics: topicIds.map((id) => ({ id, title: guideTitle(id) })),
        },
      };
    },
  }),
];
