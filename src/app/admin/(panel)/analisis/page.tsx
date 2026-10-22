import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  AnalysisHome,
  AnalysisPanel,
} from "@/domains/admin/analysis/components/analysis_content";
import {
  analysisDays,
  analysisWindow,
} from "@/domains/admin/analysis/services/analysis_rules";
import { getAnalysis } from "@/domains/admin/analysis/services/analysis_service";
import type {
  AnalysisCopy,
  AnalysisKind,
  AnalysisWindow,
} from "@/domains/admin/analysis/types/analysis";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
async function LoadedPanel({
  kind,
  w,
  variants,
  c,
}: {
  kind: AnalysisKind;
  w: AnalysisWindow;
  variants: boolean;
  c: AnalysisCopy;
}) {
  const result = await getAnalysis(kind, w, variants, c);
  return (
    <AnalysisPanel
      kind={kind}
      w={w}
      variants={variants}
      c={c}
      result={result}
    />
  );
}
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser("/admin/analisis");
  const query = await searchParams;
  let days;
  try {
    days = analysisDays(query.days);
  } catch {
    notFound();
  }
  if (
    query.rank !== undefined &&
    query.rank !== "products" &&
    query.rank !== "variants"
  )
    notFound();
  const variants = query.rank === "variants",
    w = analysisWindow(days, new Date()),
    c = getDictionary("es").admin.analysis;
  return (
    <AnalysisHome c={c} w={w} variants={variants}>
      {(["activity", "top", "inventory", "aging"] as const).map((kind) => (
        <Suspense
          key={`${kind}-${w.days}-${variants}`}
          fallback={
            <AnalysisPanel kind={kind} w={w} variants={variants} c={c} />
          }
        >
          <LoadedPanel kind={kind} w={w} variants={variants} c={c} />
        </Suspense>
      ))}
    </AnalysisHome>
  );
}
