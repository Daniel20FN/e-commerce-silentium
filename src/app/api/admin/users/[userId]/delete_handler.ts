import { canManageUsers } from "@/domains/admin/services/admin_roles";
import {
  deleteAdminUser,
  UserDeletionError,
} from "@/domains/admin/users/services/delete_admin_user";
import type { AdminUserDeleteApiResponse } from "@/domains/admin/users/types/api_responses";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function deleteUserHandler(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse<AdminUserDeleteApiResponse>> {
  const carrier = NextResponse.json(null);
  function respond(body: AdminUserDeleteApiResponse, status: number) {
    const response = NextResponse.json(body, { status });
    response.headers.set("Cache-Control", "private, no-store");
    return copySupabaseResponseCookies(carrier, response);
  }
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return respond({ type: "forbidden", message: "forbidden" }, 403);
  try {
    const actor = await resolveCurrentUser(
      createRouteHandlerSupabaseClient(request, carrier),
    );
    if (!actor)
      return respond({ type: "unauthorized", message: "unauthorized" }, 401);
    if (
      !canManageUsers(actor) ||
      actor.status !== "active" ||
      !actor.emailVerified
    )
      return respond({ type: "forbidden", message: "forbidden" }, 403);
    const { userId } = await params;
    await deleteAdminUser(userId, actor.id);
    return respond({ data: { deletedId: userId } }, 200);
  } catch (error) {
    if (error instanceof UserDeletionError)
      return respond(
        {
          type:
            error.status === 403
              ? "forbidden"
              : error.status === 404
                ? "not_found"
                : error.status === 503
                  ? "service_unavailable"
                  : "conflict",
          message: `user_delete_${error.code}`,
        },
        error.status,
      );
    return respond(
      { type: "internal_server_error", message: "user_delete_failed" },
      500,
    );
  }
}
