"use client";
import { PriorityLink } from "@/domains/admin/home/components/priority_link";
import { RefreshPriorities } from "@/domains/admin/home/components/refresh_priorities";
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { analysisMoney } from "../services/analysis_rules";
import type {
  AnalysisCopy,
  AnalysisKind,
  AnalysisResult,
  AnalysisWindow,
} from "../types/analysis";
const Charts = dynamic(() => import("./analysis_charts"), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={280} />,
});
class ChartBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Alert severity="warning">{this.props.message}</Alert>
    ) : (
      this.props.children
    );
  }
}
export function AnalysisHome({
  c,
  w,
  variants,
  children,
}: {
  c: AnalysisCopy;
  w: AnalysisWindow;
  variants: boolean;
  children: ReactNode;
}) {
  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Typography component="h1" variant="h5">
          {c.title}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <PriorityLink href="/admin" variant="outlined">
            {c.back}
          </PriorityLink>
          <RefreshPriorities label={c.refresh} pendingLabel={c.refreshing} />
        </Stack>
      </Stack>
      <Stack spacing={1}>
        <Typography component="h2" variant="subtitle2">
          {c.period}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {([7, 30, 90] as const).map((days) => (
            <PriorityLink
              key={days}
              href={`/admin/analisis?days=${days}&rank=${variants ? "variants" : "products"}`}
              variant={w.days === days ? "contained" : "outlined"}
            >
              {c.days[days]}
            </PriorityLink>
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {c.periodScope}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {c.updated}: {w.label} · {c.timezone}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "minmax(0,1.2fr) minmax(0,1fr)",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        {children}
      </Box>
      <Box
        component="aside"
        sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          {c.cohortScope}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {c.moneyScope}
        </Typography>
      </Box>
    </Stack>
  );
}
export function AnalysisPanel({
  c,
  w,
  kind,
  result,
  variants = false,
}: {
  c: AnalysisCopy;
  w: AnalysisWindow;
  kind: AnalysisKind;
  result?: AnalysisResult;
  variants?: boolean;
}) {
  const [amount, setAmount] = useState(false);
  const title = c[kind],
    current = kind === "inventory" || kind === "aging";
  const data = result?.ok ? result.data : null;
  const empty =
    kind === "activity" || kind === "top"
      ? c.empty
      : kind === "inventory"
        ? c.emptyInventory
        : c.emptyAging;
  const metric =
    kind === "activity"
      ? amount
        ? c.amount
        : c.count
      : kind === "top"
        ? c.units
        : kind === "inventory"
          ? c.variants
          : c.count;
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={title}
      sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0, overflow: "hidden" }}
    >
      <Stack spacing={1.5}>
        <Stack gap={0.5}>
          <Typography component="h2" variant="h6">
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {current ? c.current : `${w.fromDay} — ${w.today}`}
          </Typography>
        </Stack>
        {kind === "activity" && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={amount ? "amount" : "count"}
            aria-label={title}
            onChange={(_, v: string | null) => {
              if (v) setAmount(v === "amount");
            }}
            sx={{
              flexWrap: "wrap",
              gap: 0.5,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                maxWidth: "100%",
                whiteSpace: "normal",
              },
            }}
          >
            <ToggleButton value="count">{c.count}</ToggleButton>
            <ToggleButton value="amount">{c.amount}</ToggleButton>
          </ToggleButtonGroup>
        )}
        {kind === "top" && (
          <Stack direction="row" gap={1} flexWrap="wrap">
            <PriorityLink
              href={`/admin/analisis?days=${w.days}&rank=products`}
              variant={!variants ? "contained" : "outlined"}
              size="small"
            >
              {c.products}
            </PriorityLink>
            <PriorityLink
              href={`/admin/analisis?days=${w.days}&rank=variants`}
              variant={variants ? "contained" : "outlined"}
              size="small"
            >
              {c.variants}
            </PriorityLink>
          </Stack>
        )}
        {!result ? (
          <Box role="status" aria-label={c.loading}>
            <Skeleton variant="rectangular" height={325} />
          </Box>
        ) : !data ? (
          <Alert severity="error">{c.error}</Alert>
        ) : data.total === 0 ? (
          <Box sx={{ minHeight: 280, display: "flex", alignItems: "center" }}>
            <Typography color="text.secondary">{empty}</Typography>
          </Box>
        ) : (
          <>
            <Stack
              direction="row"
              gap={1}
              alignItems="baseline"
              flexWrap="wrap"
            >
              <Typography
                variant="h5"
                component="p"
                sx={{
                  fontVariantNumeric: "tabular-nums",
                  overflowWrap: "anywhere",
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                {amount && kind === "activity"
                  ? analysisMoney(data.cents)
                  : new Intl.NumberFormat("es-CO").format(data.total)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kind === "top"
                  ? c.rankingTotal
                  : current
                    ? c.totalCurrent
                    : c.total}{" "}
                · {metric}
              </Typography>
            </Stack>
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <ChartBoundary message={c.chartUnavailable}>
                <Charts
                  points={data.points}
                  line={kind === "activity"}
                  amount={amount && kind === "activity"}
                  label={metric}
                  title={title}
                />
              </ChartBoundary>
            </Box>
          </>
        )}
        {kind === "top" && (
          <Typography variant="caption" color="text.secondary">
            {c.topScope}
          </Typography>
        )}
        {kind === "inventory" && (
          <Typography variant="caption" color="text.secondary">
            {c.inventoryScope}
          </Typography>
        )}
        {kind === "aging" && (
          <Typography variant="caption" color="text.secondary">
            {c.agingScope} {c.unknownScope}
          </Typography>
        )}
        {data && (
          <Box
            component="details"
            sx={{
              "& summary": {
                cursor: "pointer",
                fontSize: ".875rem",
                fontWeight: 600,
                p: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                },
              },
            }}
          >
            <summary>{c.data}</summary>
            <TableContainer
              tabIndex={0}
              role="region"
              aria-label={`${title}: ${c.data}`}
              sx={{ maxHeight: 360, overflowX: "auto" }}
            >
              <Table
                size="small"
                aria-label={`${title}: ${c.data}`}
                sx={{ "& th, & td": { px: { xs: 1, sm: 1.5 }, py: 1 } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {kind === "activity" ? c.date : c.label}
                    </TableCell>
                    <TableCell align="right">
                      {kind === "activity" ? c.count : metric}
                    </TableCell>
                    {kind === "activity" && (
                      <TableCell align="right">{c.amount}</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.points.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          overflowWrap: "break-word",
                          wordBreak: "normal",
                          minWidth: 120,
                          maxWidth: 280,
                        }}
                      >
                        {p.href ? (
                          <Button
                            component="a"
                            href={p.href}
                            size="small"
                            variant="outlined"
                            sx={{
                              textAlign: "left",
                              whiteSpace: "normal",
                              wordBreak: "normal",
                              overflowWrap: "break-word",
                              minWidth: 0,
                              px: 1,
                              py: 0.5,
                            }}
                          >
                            {p.label}
                          </Button>
                        ) : kind === "activity" ? (
                          p.id
                        ) : (
                          p.label
                        )}
                      </TableCell>
                      <TableCell align="right">{p.count}</TableCell>
                      {kind === "activity" && (
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {analysisMoney(p.cents)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
