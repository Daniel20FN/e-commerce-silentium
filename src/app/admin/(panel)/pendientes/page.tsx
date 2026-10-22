import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OperationalQueue } from "@/domains/admin/home/components/operational_frames";
import {
  PriorityLoading,
  PriorityQueueView,
} from "@/domains/admin/home/components/priority_views";
import { resolvePriorityGroup } from "@/domains/admin/home/services/operational_rules";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PriorityPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; cursor?: string }>;
}) {
  await requireAdminUser("/admin/pendientes");
  const query = await searchParams;
  const group = resolvePriorityGroup(query.group);
  if (
    !group ||
    (query.cursor !== undefined &&
      (typeof query.cursor !== "string" ||
        !/^[a-zA-Z0-9-]{1,100}$/.test(query.cursor)))
  )
    notFound();
  const c = getDictionary("es").admin.dashboard.operations;
  return (
    <OperationalQueue copy={c}>
      <Suspense
        key={`${group}:${query.cursor ?? ""}`}
        fallback={<PriorityLoading title={c.groups[group].title} copy={c} />}
      >
        <PriorityQueueView group={group} cursor={query.cursor} copy={c} />
      </Suspense>
    </OperationalQueue>
  );
}
