import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  OAuthConsentScreen,
  OAuthNoticeScreen,
} from "@/domains/admin/mcp_oauth/components/oauth_consent_screen";
import {
  buildAuthorizationRedirect,
  validateAuthorizationRequest,
} from "@/domains/admin/mcp_oauth/services/oauth_authorization_service";
import {
  projectOAuthConsentDictionary,
  projectOAuthNoticeDictionary,
} from "@/domains/admin/mcp_oauth/services/oauth_dictionary";
import { oauthContext } from "@/domains/admin/mcp_oauth/services/oauth_origin";
import {
  onlyLoopbackRedirects,
  redirectHost,
} from "@/domains/admin/mcp_oauth/services/oauth_rules";
import type { OAuthAuthorizeParams } from "@/domains/admin/mcp_oauth/types/oauth_types";
import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import { buildLoginRedirect } from "@/domains/auth/services/auth_routes";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: getDictionary("es").mcpOAuth.consent.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const PARAM_NAMES = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;
const MAX_QUERY_LENGTH = 6_000;

type RawSearchParams = Record<string, string | string[] | undefined>;

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentUserLabel(user: CurrentUserDto): string {
  return (
    [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

/**
 * Authorization endpoint (OAuth 2.1). Order matters: sign-in first (the
 * request survives the login round trip through returnTo), then admin check,
 * then client and redirect URI validation before any redirect to the client.
 */
export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const dictionary = getDictionary("es");
  const notice = projectOAuthNoticeDictionary(dictionary);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    for (const item of Array.isArray(value) ? value : [value])
      if (item !== undefined) query.append(key, item);
  const returnTo = `/oauth/authorize?${query.toString()}`;

  const supabase = await createServerSupabaseClient();
  const user = await resolveCurrentUser(supabase);
  if (!user) redirect(buildLoginRedirect(returnTo.slice(0, MAX_QUERY_LENGTH)));
  if (!canAccessAdmin(user) || user.status !== "active")
    return (
      <OAuthNoticeScreen
        dictionary={notice}
        title={dictionary.mcpOAuth.denied.title}
        subtitle={dictionary.mcpOAuth.denied.subtitle}
        body={dictionary.mcpOAuth.denied.body}
      />
    );

  const params: OAuthAuthorizeParams = {};
  for (const name of PARAM_NAMES) params[name] = singleValue(raw[name]);

  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "";
  const context = oauthContext(`${protocol}://${host}/`);
  const validation = await validateAuthorizationRequest(params, {
    resource: context.resource,
    allowFetch: true,
  });

  if (!validation.ok && validation.kind === "page")
    return (
      <OAuthNoticeScreen
        dictionary={notice}
        title={dictionary.mcpOAuth.invalid.title}
        subtitle={dictionary.mcpOAuth.invalid.subtitle}
        body={dictionary.mcpOAuth.invalid[validation.code]}
        hint={dictionary.mcpOAuth.invalid.hint}
      />
    );
  if (!validation.ok)
    redirect(
      buildAuthorizationRedirect(
        validation.redirectUri,
        { error: validation.error, description: validation.description },
        validation.state,
        context.issuer,
      ),
    );

  const { request } = validation;
  return (
    <OAuthConsentScreen
      dictionary={projectOAuthConsentDictionary(dictionary)}
      authorization={params}
      accountLabel={currentUserLabel(user)}
      client={{
        name: request.client.name,
        uri: request.client.clientUri,
        redirectHost: redirectHost(request.redirectUri),
        loopbackOnly: onlyLoopbackRedirects([request.redirectUri]),
        requestedScopes: request.requestedScopes,
      }}
    />
  );
}
