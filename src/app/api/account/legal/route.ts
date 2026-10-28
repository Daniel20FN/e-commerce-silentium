import { AccountError } from "@/domains/account/services/account_errors";
import { accountRoute } from "@/domains/account/services/account_route";
import {
  readLegalPreferences,
  saveLegalPreferences,
} from "@/domains/legal/services/consent_service";
import { legalPreferencesSchema } from "@/domains/legal/services/legal_schemas";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return accountRoute(request, (user) => readLegalPreferences(user.id));
}
export async function PATCH(request: NextRequest) {
  return accountRoute(request, async (user) => {
    const input = legalPreferencesSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) throw new AccountError("legal_acceptance_required");
    return saveLegalPreferences(user, input.data);
  });
}
