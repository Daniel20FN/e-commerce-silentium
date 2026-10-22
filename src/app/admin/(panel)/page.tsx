import { getDictionary } from "@/dictionary/services/get-dictionary";
import { OperationalHome } from "@/domains/admin/home/components/operational_frames";
import {
  PriorityLoading,
  PriorityPanel,
} from "@/domains/admin/home/components/priority_views";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";
import { Suspense } from "react";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  await requireAdminUser();
  const c = getDictionary("es").admin.dashboard.operations;
  return (
    <OperationalHome copy={c}>
      <Suspense fallback={<PriorityLoading title={c.blocks.orders} copy={c} />}>
        <PriorityPanel block="orders" copy={c} />
      </Suspense>
      <Suspense
        fallback={<PriorityLoading title={c.blocks.inventory} copy={c} />}
      >
        <PriorityPanel block="inventory" copy={c} />
      </Suspense>
      <Suspense
        fallback={<PriorityLoading title={c.blocks.catalog} copy={c} />}
      >
        <PriorityPanel block="catalog" copy={c} />
      </Suspense>
    </OperationalHome>
  );
}
