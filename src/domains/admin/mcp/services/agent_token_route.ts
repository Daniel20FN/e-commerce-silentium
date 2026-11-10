import { AccountError } from "@/domains/account/services/account_errors";
import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import {
  copySupabaseResponseCookies,
  createRouteHandlerSupabaseClient,
} from "@/lib/supabase/server";
import type {
  ApiResponse,
  ApiResponseType,
} from "@/types/api-service/api_response";
import { NextRequest, NextResponse } from "next/server";
import { McpTokenError } from "./mcp_token_service";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function typeForStatus(status: number): ApiResponseType {
  switch (status) {
    case 400:
      return "validation_error";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "service_unavailable";
    default:
      return "service_unavailable";
  }
}

export class AgentTokenRouteError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

interface AgentTokenRouteOptions {
  /** Mutations that carry a JSON body also require a JSON content type. */
  jsonBody?: boolean;
  successStatus?: number;
}

/**
 * Session-cookie route for the admin token UI. Only an active admin or
 * superadmin acts on their own tokens; mutations additionally require a
 * same-origin request.
 */
export async function agentTokenRoute<T>(
  request: NextRequest,
  action: (user: CurrentUserDto) => Promise<T>,
  options: AgentTokenRouteOptions = {},
): Promise<NextResponse<ApiResponse<T>>> {
  const cookies = NextResponse.json(null);
  let body: ApiResponse<T>;
  let status = options.successStatus ?? 200;
  try {
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !== request.nextUrl.origin ||
        (options.jsonBody &&
          !request.headers.get("content-type")?.startsWith("application/json")))
    )
      throw new AgentTokenRouteError("forbidden", 403);
    const client = createRouteHandlerSupabaseClient(request, cookies);
    const user = await resolveCurrentUser(client);
    if (!user) throw new AgentTokenRouteError("unauthorized", 401);
    if (!canAccessAdmin(user) || user.status !== "active")
      throw new AgentTokenRouteError("forbidden", 403);
    body = { data: await action(user) };
  } catch (error) {
    if (
      error instanceof AgentTokenRouteError ||
      error instanceof AccountError ||
      error instanceof McpTokenError
    ) {
      status = error.status;
      body = { type: typeForStatus(status), message: error.code };
    } else {
      console.error("agent_token_operation_failed", {
        method: request.method,
      });
      status = 503;
      body = { type: "service_unavailable", message: "account_unavailable" };
    }
  }
  return copySupabaseResponseCookies(
    cookies,
    NextResponse.json(body, { status, headers: PRIVATE_HEADERS }),
  );
}
