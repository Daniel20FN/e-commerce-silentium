import {
  AgentTokenRouteError,
  agentTokenRoute,
} from "@/domains/admin/mcp/services/agent_token_route";
import {
  buildAuthorizationRedirect,
  issueAuthorizationCode,
  validateAuthorizationRequest,
} from "@/domains/admin/mcp_oauth/services/oauth_authorization_service";
import { oauthContext } from "@/domains/admin/mcp_oauth/services/oauth_origin";
import { oauthDecisionSchema } from "@/domains/admin/mcp_oauth/services/oauth_schemas";
import type { OAuthDecisionApiResponse } from "@/domains/admin/mcp_oauth/types/api_responses";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Consent decision. Session-cookie route protected against CSRF three ways:
 * the request must be same-origin (Origin header), JSON (which browsers cannot
 * send cross-site without a CORS preflight that this route never grants) and
 * not flagged `Sec-Fetch-Site: cross-site`. The whole authorization request is
 * validated again here; nothing from the form is trusted.
 */
export function POST(
  request: NextRequest,
): Promise<NextResponse<OAuthDecisionApiResponse>> {
  return agentTokenRoute(
    request,
    async (user) => {
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new AgentTokenRouteError("forbidden", 403);
      const input = oauthDecisionSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!input.success)
        throw new AgentTokenRouteError("validation_error", 400);
      const context = oauthContext(request.url);
      const validation = await validateAuthorizationRequest(
        input.data.authorization,
        { resource: context.resource, allowFetch: false },
      );
      if (!validation.ok && validation.kind === "page")
        throw new AgentTokenRouteError("validation_error", 400);
      if (!validation.ok)
        return {
          redirectTo: buildAuthorizationRedirect(
            validation.redirectUri,
            { error: validation.error, description: validation.description },
            validation.state,
            context.issuer,
          ),
        };
      const { request: authorization } = validation;
      if (input.data.decision === "deny")
        return {
          redirectTo: buildAuthorizationRedirect(
            authorization.redirectUri,
            { error: "access_denied", description: "The user denied access" },
            authorization.state,
            context.issuer,
          ),
        };
      const code = await issueAuthorizationCode(
        user.id,
        authorization,
        input.data.access,
      );
      return {
        redirectTo: buildAuthorizationRedirect(
          authorization.redirectUri,
          { code },
          authorization.state,
          context.issuer,
        ),
      };
    },
    { jsonBody: true },
  );
}
