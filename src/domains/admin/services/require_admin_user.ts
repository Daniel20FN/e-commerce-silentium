import "server-only";

import { buildLoginRedirect } from "@/domains/auth/services/auth_routes";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "./admin_roles";

export async function requireAdminUser(
  returnTo = "/admin",
): Promise<CurrentUserDto> {
  const supabase = await createServerSupabaseClient();
  const user = await resolveCurrentUser(supabase);

  if (!user) {
    redirect(buildLoginRedirect(returnTo));
  }

  if (!canAccessAdmin(user)) {
    redirect("/admin/forbidden");
  }

  return user;
}
