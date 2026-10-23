import {
  acceptInvitation,
  pendingInvitation,
} from "@/domains/admin/users/services/invitation_acceptance";
import {
  invitationFailure,
  invitationJson,
  requireInvitationOrigin,
} from "@/domains/admin/users/services/invitation_response";
import { acceptInvitationSchema } from "@/domains/admin/users/services/invitation_schemas";
import type {
  AcceptInvitationApiResponse,
  AcceptInvitationData,
  PendingInvitationApiResponse,
  PendingInvitationData,
} from "@/domains/auth/types/invitation_api";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<PendingInvitationApiResponse>> {
  const cookies = NextResponse.json(null);
  try {
    const { data, error } = await createRouteHandlerSupabaseClient(
      request,
      cookies,
    ).auth.getUser();
    if (error || !data.user)
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<PendingInvitationData>(
          { type: "unauthorized", message: "invitation_unavailable" },
          401,
        ),
      );
    const invitation = await pendingInvitation(data.user);
    return copySupabaseResponseCookies(
      cookies,
      invitationJson({
        data: {
          email: invitation.email,
          firstName: invitation.firstName,
        },
      }),
    );
  } catch (error) {
    return copySupabaseResponseCookies(
      cookies,
      invitationFailure<PendingInvitationData>(error),
    );
  }
}
export async function POST(
  request: NextRequest,
): Promise<NextResponse<AcceptInvitationApiResponse>> {
  const cookies = NextResponse.json(null);
  try {
    requireInvitationOrigin(request);
    const supabase = createRouteHandlerSupabaseClient(request, cookies);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user)
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<AcceptInvitationData>(
          { type: "unauthorized", message: "invitation_unavailable" },
          401,
        ),
      );
    const input = acceptInvitationSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success)
      return copySupabaseResponseCookies(
        cookies,
        invitationJson<AcceptInvitationData>(
          { type: "validation_error", message: "invitation_invalid_fields" },
          400,
        ),
      );
    return copySupabaseResponseCookies(
      cookies,
      invitationJson({
        data: await acceptInvitation(data.user, input.data, supabase),
      }),
    );
  } catch (error) {
    return copySupabaseResponseCookies(
      cookies,
      invitationFailure<AcceptInvitationData>(error),
    );
  }
}
