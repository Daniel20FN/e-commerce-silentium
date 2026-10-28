import { AccountError } from "@/domains/account/services/account_errors";
import { accountRoute } from "@/domains/account/services/account_route";
import { hasAdminAccess } from "@/domains/admin/services/admin_roles";
import { readLegalEvidence } from "@/domains/legal/services/legal_evidence";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = await accountRoute(request, async (user) => {
    if (!hasAdminAccess(user.role) || user.status !== "active")
      throw new AccountError("forbidden", 403);
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId || userId.length > 100)
      throw new AccountError("account_invalid_fields");
    return readLegalEvidence(userId);
  });
  if (response.ok)
    response.headers.set(
      "Content-Disposition",
      'attachment; filename="silentium-evidencias.json"',
    );
  return response;
}
