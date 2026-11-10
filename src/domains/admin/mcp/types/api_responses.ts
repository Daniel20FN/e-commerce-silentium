import type { ApiResponse } from "@/types/api-service/api_response";
import type { McpTokenDto } from "./mcp_token";

export interface McpTokensListApiResponseData {
  tokens: McpTokenDto[];
}

export interface McpTokenCreateApiResponseData {
  token: McpTokenDto;
  /** Plaintext secret. Returned exactly once, at creation. */
  secret: string;
}

export interface McpTokenRevokeApiResponseData {
  token: McpTokenDto;
}

export type McpTokensListApiResponse =
  ApiResponse<McpTokensListApiResponseData>;
export type McpTokenCreateApiResponse =
  ApiResponse<McpTokenCreateApiResponseData>;
export type McpTokenRevokeApiResponse =
  ApiResponse<McpTokenRevokeApiResponseData>;
