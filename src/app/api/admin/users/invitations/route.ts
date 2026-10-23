import { canManageUsers } from "@/domains/admin/services/admin_roles";
import {
  invitationFailure,
  invitationJson,
  requireInvitationOrigin,
} from "@/domains/admin/users/services/invitation_response";
import { userInvitationSchema } from "@/domains/admin/users/services/invitation_schemas";
import { inviteAdminUser } from "@/domains/admin/users/services/invitation_service";
import type {
  AdminUserInviteApiResponse,
  AdminUserInviteData,
} from "@/domains/admin/users/types/api_responses";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AdminUserInviteApiResponse>> {
  const cookies = NextResponse.json(null);
  try {
    requireInvitationOrigin(request);
    const user = await resolveCurrentUser(
      createRouteHandlerSupabaseClient(request, cookies),
    );
    if (!user)
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<AdminUserInviteData>(
          { type: "unauthorized", message: "unauthorized" },
          401,
        ),
      );
    if (
      !canManageUsers(user) ||
      !user.emailVerified ||
      user.status !== "active"
    )
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<AdminUserInviteData>(
          { type: "forbidden", message: "forbidden" },
          403,
        ),
      );
    const input = userInvitationSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success)
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<AdminUserInviteData>(
          { type: "validation_error", message: "invitation_invalid_fields" },
          400,
        ),
      );
    return copySupabaseResponseCookies(
      cookies,
      invitationJson({ data: await inviteAdminUser(input.data, user.id) }),
    );
  } catch (error) {
    return copySupabaseResponseCookies(
      cookies,
      invitationFailure<AdminUserInviteData>(error),
    );
  }
}
