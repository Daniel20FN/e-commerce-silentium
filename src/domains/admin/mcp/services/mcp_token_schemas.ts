import { z } from "zod";
import {
  MCP_TOKEN_ACCESS_VALUES,
  MCP_TOKEN_EXPIRY_DAYS_VALUES,
} from "../types/mcp_token";
import { MCP_TOKEN_NAME_MAX_LENGTH } from "./mcp_token_rules";

export const mcpTokenCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(MCP_TOKEN_NAME_MAX_LENGTH),
    access: z.enum(MCP_TOKEN_ACCESS_VALUES),
    expiresInDays: z.union([
      z.literal(MCP_TOKEN_EXPIRY_DAYS_VALUES[0]),
      z.literal(MCP_TOKEN_EXPIRY_DAYS_VALUES[1]),
    ]),
    currentPassword: z.string().min(1).max(1024),
  })
  .strict();

export const mcpTokenIdSchema = z.string().trim().min(1).max(128);
