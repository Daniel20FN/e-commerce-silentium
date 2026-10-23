import type { ApiResponse } from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";
import { InvitationError } from "./invitation_errors";

export function invitationJson<T>(
  body: ApiResponse<T>,
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function requireInvitationOrigin(request: NextRequest): void {
  if (
    request.headers.get("origin") !== request.nextUrl.origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    throw new InvitationError("forbidden", 403);
}
export function invitationFailure<T>(
  error: unknown,
): NextResponse<ApiResponse<T>> {
  if (error instanceof InvitationError)
    return invitationJson<T>(
      {
        type:
          error.status === 403
            ? "forbidden"
            : error.status === 409
              ? "conflict"
              : error.status === 503 || error.status === 429
                ? "service_unavailable"
                : "bad_request",
        message: error.code,
      },
      error.status,
    );
  console.error("invitation_operation_failed");
  return invitationJson<T>(
    { type: "internal_server_error", message: "internal_server_error" },
    500,
  );
}
