import { getDictionary } from "@/dictionary/services/get-dictionary";
import { GuideContent } from "@/domains/admin/guide/components/guide_content";
import { GuideFrame } from "@/domains/admin/guide/components/guide_frame";
import { readGuideQuery } from "@/domains/admin/guide/services/guide_content";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminGuidePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser("/admin/guia");
  const { query, topic } = readGuideQuery(await searchParams);
  return (
    <GuideFrame>
      <GuideContent
        key={query + "/" + topic}
        copy={getDictionary("es").admin.guide}
        query={query}
        topic={topic}
      />
    </GuideFrame>
  );
}
