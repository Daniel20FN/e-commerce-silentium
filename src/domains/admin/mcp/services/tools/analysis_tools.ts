import { getDictionary } from "@/dictionary/services/get-dictionary";
import { analysisWindow } from "@/domains/admin/analysis/services/analysis_rules";
import { getAnalysis } from "@/domains/admin/analysis/services/analysis_service";
import type {
  AnalysisData,
  AnalysisKind,
} from "@/domains/admin/analysis/types/analysis";
import { z } from "zod";
import { McpToolError } from "../mcp_errors";
import { defineReadTool } from "../mcp_tool_types";

const ANALYSIS_KINDS = ["activity", "top", "inventory", "aging"] as const;

export const analysisTools = [
  defineReadTool({
    name: "analysis_get",
    group: "analysis",
    title: "Get store analysis",
    description:
      "Returns the admin analysis for the last 7, 30 or 90 days (Colombia calendar): order activity, top products or variants (rank), and the current inventory and pending-order aging snapshots. Choose kinds to limit the sections; all four by default.",
    inputSchema: z.object({
      days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
      rank: z.enum(["products", "variants"]).default("products"),
      kinds: z.array(z.enum(ANALYSIS_KINDS)).min(1).max(4).optional(),
    }),
    handler: async (input) => {
      const window = analysisWindow(input.days, new Date());
      const copy = getDictionary("es").admin.analysis;
      const kinds: AnalysisKind[] = [...new Set(input.kinds ?? ANALYSIS_KINDS)];
      const sections: Partial<Record<AnalysisKind, AnalysisData>> = {};
      for (const kind of kinds) {
        const result = await getAnalysis(
          kind,
          window,
          input.rank === "variants",
          copy,
        );
        if (!result.ok)
          throw new McpToolError("internal_error", "analysis_unavailable");
        sections[kind] = result.data;
      }
      return { window, sections };
    },
  }),
];
