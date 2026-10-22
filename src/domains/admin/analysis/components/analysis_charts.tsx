"use client";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { analysisMoney } from "../services/analysis_rules";
import type { AnalysisPoint } from "../types/analysis";
type Props = {
  points: AnalysisPoint[];
  line: boolean;
  amount: boolean;
  label: string;
  title: string;
};
export default function AnalysisCharts({
  points,
  line,
  amount,
  label,
  title,
}: Props) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  const data = points.map((p) => (amount ? p.cents / 100 : p.count));
  const valueFormatter = (
    v: number | null,
    context: { dataIndex: number },
  ): string =>
    v === null
      ? ""
      : amount
        ? analysisMoney(points[context.dataIndex].cents)
        : new Intl.NumberFormat("es-CO").format(v);
  const color =
    theme.palette.mode === "dark"
      ? theme.palette.secondary.light
      : theme.palette.primary.main;
  if (line)
    return (
      <LineChart
        height={280}
        skipAnimation
        hideLegend
        grid={{ horizontal: true }}
        aria-label={title}
        xAxis={[
          {
            scaleType: "point",
            height: 36,
            data: points.map((p) => p.label),
            tickLabelInterval: (_, i) =>
              i === 0 ||
              i === points.length - 1 ||
              i % Math.max(1, Math.ceil(points.length / (compact ? 2 : 5))) ===
                0,
          },
        ]}
        yAxis={[
          {
            min: 0,
            width: 64,
            tickNumber: 4,
            valueFormatter: (v: number) =>
              amount
                ? new Intl.NumberFormat("es-CO", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                : new Intl.NumberFormat("es-CO").format(v),
            tickInterval: amount ? undefined : (v) => Number.isInteger(v),
          },
        ]}
        series={[
          {
            data,
            label,
            color,
            valueFormatter,
            showMark: points.length <= 7,
            curve: "linear",
          },
        ]}
        margin={{ top: 20, bottom: 12, right: 28, left: 0 }}
      />
    );
  return (
    <BarChart
      height={280}
      skipAnimation
      hideLegend
      grid={{ vertical: true }}
      aria-label={title}
      layout="horizontal"
      yAxis={[
        {
          scaleType: "band",
          data: points.map((_, i) => i),
          valueFormatter: (v: number, context) => {
            const label = points[v].label;
            return context.location === "tick" && label.length > 23
              ? `${label.slice(0, 21)}\u2026`
              : label;
          },
          width: compact ? 92 : 130,
        },
      ]}
      xAxis={[
        {
          min: 0,
          height: 36,
          tickNumber: 4,
          tickInterval: (v) => Number.isInteger(v),
        },
      ]}
      series={[{ data, label, color, valueFormatter }]}
      margin={{ top: 12, bottom: 12, right: 16, left: 0 }}
      borderRadius={3}
    />
  );
}
