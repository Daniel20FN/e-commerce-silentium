import type { ApiResponse } from "@/types/api-service/api_response";
import type { McpOAuthGrantDto } from "./oauth_types";

export interface OAuthDecisionApiResponseData {
  /** Where the browser must go next (client callback with code or error). */
  redirectTo: string;
}

export interface McpOAuthGrantsListApiResponseData {
  grants: McpOAuthGrantDto[];
}

export interface McpOAuthGrantRevokeApiResponseData {
  grant: McpOAuthGrantDto;
}

export interface McpOAuthGrantDeleteApiResponseData {
  id: string;
}

export type OAuthDecisionApiResponse =
  ApiResponse<OAuthDecisionApiResponseData>;
export type McpOAuthGrantsListApiResponse =
  ApiResponse<McpOAuthGrantsListApiResponseData>;
export type McpOAuthGrantRevokeApiResponse =
  ApiResponse<McpOAuthGrantRevokeApiResponseData>;
export type McpOAuthGrantDeleteApiResponse =
  ApiResponse<McpOAuthGrantDeleteApiResponseData>;
