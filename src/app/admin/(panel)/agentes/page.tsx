import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AgentTokensPage } from "@/domains/admin/mcp/components/agent_tokens_page";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAgentsRoutePage() {
  await requireAdminUser("/admin/agentes");

  return <AgentTokensPage dictionary={getDictionary("es")} />;
}
