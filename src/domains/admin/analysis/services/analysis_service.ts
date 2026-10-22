import { BUSINESS_TIME_ZONE } from "@/domains/admin/home/services/operational_rules";
import { inventoryPriorityWhere } from "@/domains/admin/home/services/operational_service";
import { OPEN_FULFILLMENTS } from "@/domains/admin/orders/services/order_rules";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import type {
  AnalysisCopy,
  AnalysisData,
  AnalysisKind,
  AnalysisResult,
  AnalysisWindow,
} from "../types/analysis";
import { fillActivity, safeAggregate, sumSafe } from "./analysis_rules";

// Prisma stores DateTime as timestamp without time zone, containing UTC values.
// Interpret UTC explicitly before projecting Colombia's calendar (never depend on DB session TimeZone).
function localDay(timestamp: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`((${timestamp} AT TIME ZONE 'UTC') AT TIME ZONE ${BUSINESS_TIME_ZONE})::date`;
}
function cutoff(w: AnalysisWindow): Prisma.Sql {
  return Prisma.sql`(${w.asOf}::timestamptz AT TIME ZONE 'UTC')`;
}
function cohort(w: AnalysisWindow): Prisma.Sql {
  return Prisma.sql`WITH cohort AS (
 SELECT o.id, o."subtotalCents", c."confirmedAt"
 FROM "ManualOrder" o
 JOIN LATERAL (SELECT MIN(e."createdAt") AS "confirmedAt" FROM "OrderEvent" e WHERE e."orderId"=o.id AND e.kind='confirmed') c ON true
 WHERE o.status='confirmed' AND c."confirmedAt" >= ((${w.fromDay}::date AT TIME ZONE ${BUSINESS_TIME_ZONE}) AT TIME ZONE 'UTC') AND c."confirmedAt" <= ${cutoff(w)}
 )`;
}
async function readAnalysis(
  tx: Prisma.TransactionClient,
  kind: AnalysisKind,
  w: AnalysisWindow,
  variants: boolean,
  c: AnalysisCopy,
): Promise<AnalysisData> {
  if (kind === "activity") {
    const rows = await tx.$queryRaw<
      { day: string; count: bigint; cents: bigint }[]
    >(
      Prisma.sql`${cohort(w)} SELECT to_char(${localDay(Prisma.sql`"confirmedAt"`)},'YYYY-MM-DD') AS day, COUNT(*) AS count, SUM("subtotalCents")::bigint AS cents FROM cohort GROUP BY day ORDER BY day`,
    );
    const points = fillActivity(w, rows);
    return {
      points,
      total: sumSafe(points.map((p) => p.count)),
      cents: sumSafe(points.map((p) => p.cents)),
    };
  }
  if (kind === "top") {
    const key = variants
      ? Prisma.sql`l."variantId"`
      : Prisma.sql`l."productId"`;
    const rows = await tx.$queryRaw<
      {
        id: string;
        name: string;
        sku: string;
        productId: string;
        count: bigint;
      }[]
    >(Prisma.sql`${cohort(w)}, ranked AS (
 SELECT ${key} AS id, SUM(l.quantity)::bigint AS count
 FROM cohort c JOIN "ManualOrderLine" l ON l."orderId"=c.id
 GROUP BY ${key} ORDER BY count DESC, id LIMIT 5
 ) SELECT r.id, r.count, snapshot."productName" AS name, snapshot.sku, snapshot."productId"
 FROM ranked r JOIN LATERAL (
 SELECT l."productName", l.sku, l."productId" FROM cohort c JOIN "ManualOrderLine" l ON l."orderId"=c.id
 WHERE ${key}=r.id ORDER BY c."confirmedAt" DESC, c.id DESC, l.id DESC LIMIT 1
 ) snapshot ON true ORDER BY r.count DESC, r.id`);
    const points = rows.map((r) => ({
      id: r.id,
      label: variants ? `${r.name} · ${r.sku}` : r.name,
      count: safeAggregate(r.count),
      cents: 0,
      href: `/admin/productos/${encodeURIComponent(r.productId)}?section=information`,
    }));
    return { points, total: sumSafe(points.map((p) => p.count)), cents: 0 };
  }
  if (kind === "inventory") {
    const [total, out, low] = await Promise.all([
      tx.productVariant.count({
        where: {
          deletedAt: null,
          product: {
            deletedAt: null,
            archivedAt: null,
            status: { not: "archived" },
          },
        },
      }),
      tx.productVariant.count({ where: inventoryPriorityWhere(tx, "out") }),
      tx.productVariant.count({ where: inventoryPriorityWhere(tx, "low") }),
    ]);
    if (out + low > total) throw Error("invalid_inventory_partition");
    return {
      points: [
        {
          id: "out",
          label: c.out,
          count: out,
          cents: 0,
          href: "/admin/pendientes?group=out",
        },
        {
          id: "low",
          label: c.low,
          count: low,
          cents: 0,
          href: "/admin/pendientes?group=low",
        },
        {
          id: "other",
          label: c.other,
          count: total - out - low,
          cents: 0,
          href: null,
        },
      ],
      total,
      cents: 0,
    };
  }
  const rows = await tx.$queryRaw<
    { bucket: string; count: bigint }[]
  >(Prisma.sql`WITH pending AS (
 SELECT ${localDay(Prisma.sql`${cutoff(w)}`)} - ${localDay(Prisma.sql`c."confirmedAt"`)} AS age, c."confirmedAt"
 FROM "ManualOrder" o JOIN LATERAL (SELECT MIN(e."createdAt") AS "confirmedAt" FROM "OrderEvent" e WHERE e."orderId"=o.id AND e.kind='confirmed') c ON true
 WHERE o.status='confirmed' AND o.fulfillment::text IN (${Prisma.join(OPEN_FULFILLMENTS)})
 ) SELECT CASE WHEN "confirmedAt" IS NULL OR "confirmedAt">${cutoff(w)} THEN 'unknown' WHEN age<=2 THEN '0' WHEN age<=7 THEN '3' ELSE '8' END AS bucket, COUNT(*) AS count FROM pending GROUP BY bucket`);
  const count = (id: string): number =>
    safeAggregate(rows.find((r) => r.bucket === id)?.count ?? BigInt(0));
  const points = [
    { id: "0", label: c.age0 },
    { id: "3", label: c.age3 },
    { id: "8", label: c.age8 },
    { id: "unknown", label: c.ageUnknown },
  ].map((p) => ({ ...p, count: count(p.id), cents: 0, href: null }));
  return { points, total: sumSafe(points.map((p) => p.count)), cents: 0 };
}
export async function getAnalysis(
  kind: AnalysisKind,
  window: AnalysisWindow,
  variants: boolean,
  copy: AnalysisCopy,
): Promise<AnalysisResult> {
  try {
    const data = await prisma.$transaction(
      (tx) => readAnalysis(tx, kind, window, variants, copy),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000,
        maxWait: 5000,
      },
    );
    return { ok: true, data };
  } catch (error) {
    console.error(
      "admin_analysis_failed",
      kind,
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false };
  }
}
