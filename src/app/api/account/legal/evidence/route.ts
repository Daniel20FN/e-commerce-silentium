import { accountRoute } from "@/domains/account/services/account_route";
import { readLegalEvidence } from "@/domains/legal/services/legal_evidence";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = await accountRoute(request, (user) =>
    readLegalEvidence(user.id),
  );
  if (response.ok)
    response.headers.set(
      "Content-Disposition",
      'attachment; filename="silentium-consentimientos.json"',
    );
  return response;
}
