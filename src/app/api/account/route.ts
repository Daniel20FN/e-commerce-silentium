import { AccountError } from "@/domains/account/services/account_errors";
import { accountRoute } from "@/domains/account/services/account_route";
import {
  accountDeleteSchema,
  accountProfileSchema,
} from "@/domains/account/services/account_schemas";
import {
  readAccount,
  removeAccount,
  updateAccount,
  withVerifiedPassword,
} from "@/domains/account/services/account_service";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return accountRoute(request, readAccount);
}
export async function PATCH(request: NextRequest) {
  return accountRoute(request, async (user) => {
    const input = accountProfileSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) throw new AccountError("account_invalid_fields");
    return updateAccount(user, input.data);
  });
}
export async function DELETE(request: NextRequest) {
  return accountRoute(request, async (user, client) => {
    const input = accountDeleteSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (
      !input.success ||
      input.data.confirmationEmail !== user.email.toLowerCase()
    )
      throw new AccountError("account_invalid_fields");
    await withVerifiedPassword(user, input.data.currentPassword, async () =>
      removeAccount(user),
    );
    await client.auth.signOut({ scope: "local" });
    return { success: true };
  });
}
