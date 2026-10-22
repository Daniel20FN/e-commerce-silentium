import type { Dictionary } from "@/dictionary/services/get-dictionary";
export type AnalysisCopy = Dictionary["admin"]["analysis"];
export type AnalysisDays = 7 | 30 | 90;
export type AnalysisKind = "activity" | "top" | "inventory" | "aging";
export type AnalysisWindow = {
  days: AnalysisDays;
  fromDay: string;
  today: string;
  asOf: string;
  label: string;
};
export type AnalysisPoint = {
  id: string;
  label: string;
  count: number;
  cents: number;
  href: string | null;
};
export type AnalysisData = {
  points: AnalysisPoint[];
  total: number;
  cents: number;
};
export type AnalysisResult = { ok: true; data: AnalysisData } | { ok: false };
