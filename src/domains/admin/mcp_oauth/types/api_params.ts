import type { OAuthAccess, OAuthAuthorizeParams } from "./oauth_types";

export interface OAuthDecisionParams {
  authorization: OAuthAuthorizeParams;
  decision: "approve" | "deny";
  access: OAuthAccess;
}
