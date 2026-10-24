import { AccountError } from "@/domains/account/services/account_errors";
import { accountRoute } from "@/domains/account/services/account_route";
import { accountPasswordSchema } from "@/domains/account/services/account_schemas";
import { withVerifiedPassword } from "@/domains/account/services/account_service";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return accountRoute(request, async (user, client) => {
    if (user.status === "blocked" || user.status === "inactive")
      throw new AccountError("account_disabled", 403);
    const input = accountPasswordSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) throw new AccountError("account_invalid_fields");
    await withVerifiedPassword(
      user,
      input.data.currentPassword,
      async (verified) => {
        const { error } = await verified.auth.updateUser({
          password: input.data.password,
        });
        if (error) throw new AccountError("account_password_failed");
        const signedOut = await verified.auth.signOut({ scope: "global" });
        if (signedOut.error) throw new AccountError("account_unavailable", 503);
      },
    );
    await client.auth.signOut({ scope: "local" });
    return { success: true };
  });
}
