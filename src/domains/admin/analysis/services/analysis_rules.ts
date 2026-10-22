import {
  BUSINESS_TIME_ZONE,
  operationalDate,
} from "@/domains/admin/home/services/operational_rules";
import type {
  AnalysisDays,
  AnalysisPoint,
  AnalysisWindow,
} from "../types/analysis";
export function analysisDays(
  value: string | string[] | undefined,
): AnalysisDays {
  if (value === undefined || value === "30") return 30;
  if (value === "7") return 7;
  if (value === "90") return 90;
  throw Error("invalid_analysis_period");
}
export function businessDay(value: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string): string => {
    const p = parts.find((p) => p.type === type);
    if (!p) throw Error("invalid_business_date");
    return p.value;
  };
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function analysisWindow(days: AnalysisDays, now: Date): AnalysisWindow {
  const today = businessDay(now);
  return {
    days,
    today,
    fromDay: shiftDay(today, 1 - days),
    asOf: now.toISOString(),
    label: operationalDate(now.toISOString()),
  };
}
export function safeAggregate(value: bigint): number {
  if (value < BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("unsafe_analysis_aggregate");
  return Number(value);
}
export function analysisMoney(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0)
    throw Error("unsafe_analysis_money");
  const amount = BigInt(cents);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
  })
    .formatToParts(amount / BigInt(100))
    .map((p) =>
      p.type === "fraction"
        ? (amount % BigInt(100)).toString().padStart(2, "0")
        : p.value,
    )
    .join("");
}
export function fillActivity(
  window: AnalysisWindow,
  records: { day: string; count: bigint; cents: bigint }[],
): AnalysisPoint[] {
  const rows = new Map(records.map((r) => [r.day, r]));
  return Array.from({ length: window.days }, (_, i) => {
    const id = shiftDay(window.fromDay, i),
      r = rows.get(id);
    return {
      id,
      label: `${id.slice(8)}/${id.slice(5, 7)}`,
      count: safeAggregate(r?.count ?? BigInt(0)),
      cents: safeAggregate(r?.cents ?? BigInt(0)),
      href: null,
    };
  });
}
export function sumSafe(values: number[]): number {
  return safeAggregate(values.reduce((s, n) => s + BigInt(n), BigInt(0)));
}
