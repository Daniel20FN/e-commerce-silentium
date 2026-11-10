import type { z } from "zod";
import type { McpTokenScopeValue } from "../types/mcp_token";
import type { McpActor } from "./mcp_auth";

export type McpToolGroup =
  | "catalog"
  | "publication"
  | "inventory"
  | "orders"
  | "media"
  | "analysis";

export interface McpToolContext {
  actor: McpActor;
}

/** Behavioral hints published to MCP clients (MCP `ToolAnnotations`). */
export interface McpToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/**
 * Registered tool. The generic input type is erased behind `run`, which
 * validates the raw arguments with the tool's zod schema before delegating to
 * the domain service, so no cast is needed to store heterogeneous tools.
 */
export interface McpToolDefinition {
  name: string;
  group: McpToolGroup;
  title: string;
  description: string;
  scope: McpTokenScopeValue;
  annotations: McpToolAnnotations;
  inputSchema: z.ZodType;
  run: (rawInput: unknown, context: McpToolContext) => Promise<unknown>;
}

interface McpToolSpec<TSchema extends z.ZodType> {
  name: string;
  group: McpToolGroup;
  title: string;
  description: string;
  inputSchema: TSchema;
  handler: (
    input: z.output<TSchema>,
    context: McpToolContext,
  ) => Promise<unknown>;
}

interface ReadToolSpec<TSchema extends z.ZodType> extends McpToolSpec<TSchema> {
  idempotent?: never;
  destructive?: never;
}

interface WriteToolSpec<TSchema extends z.ZodType>
  extends McpToolSpec<TSchema> {
  /** True when the tool can remove, cancel or reduce existing data. */
  destructive: boolean;
  /** True when repeating the same call has no further effect. */
  idempotent?: boolean;
}

/** Read tools never change data and never need an explicit destructive flag. */
export function defineReadTool<TSchema extends z.ZodType>(
  spec: ReadToolSpec<TSchema>,
): McpToolDefinition {
  return {
    name: spec.name,
    group: spec.group,
    title: spec.title,
    description: spec.description,
    scope: "read",
    annotations: {
      title: spec.title,
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: spec.inputSchema,
    run: (rawInput, context) =>
      spec.handler(spec.inputSchema.parse(rawInput), context),
  };
}

/**
 * Write tools always state `destructive` explicitly: per the MCP spec an
 * absent destructiveHint means "true" for non read-only tools.
 */
export function defineWriteTool<TSchema extends z.ZodType>(
  spec: WriteToolSpec<TSchema>,
): McpToolDefinition {
  return {
    name: spec.name,
    group: spec.group,
    title: spec.title,
    description: spec.description,
    scope: "write",
    annotations: {
      title: spec.title,
      readOnlyHint: false,
      destructiveHint: spec.destructive,
      idempotentHint: spec.idempotent ?? false,
      openWorldHint: false,
    },
    inputSchema: spec.inputSchema,
    run: (rawInput, context) =>
      spec.handler(spec.inputSchema.parse(rawInput), context),
  };
}
