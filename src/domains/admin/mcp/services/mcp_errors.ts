import { z } from "zod";

export type McpToolErrorType =
  | "validation_error"
  | "conflict"
  | "not_found"
  | "invalid_state"
  | "forbidden"
  | "internal_error";

/** Error raised by the MCP layer itself (scope, unavailable data...). */
export class McpToolError extends Error {
  constructor(
    public readonly type: McpToolErrorType,
    public readonly code: string,
  ) {
    super(code);
    this.name = "McpToolError";
  }
}

export interface McpToolErrorPayload {
  type: McpToolErrorType;
  code: string;
  hint: string;
  issues?: { path: string; message: string }[];
}

const HINTS: Record<McpToolErrorType, string> = {
  validation_error: "The input is not valid. Fix it and retry.",
  conflict:
    "The record changed or already exists. Re-read it and retry with its latest revision.",
  not_found: "The record does not exist or is not available.",
  invalid_state:
    "The record is not in a state that allows this operation. Re-read it first.",
  forbidden: "The token is not allowed to run this tool.",
  internal_error:
    "Unexpected error. Nothing was disclosed; retry later or use the admin panel.",
};

const DOMAIN_ERROR_TYPES: readonly McpToolErrorType[] = [
  "validation_error",
  "conflict",
  "not_found",
  "invalid_state",
];
/** Domain codes are snake_case identifiers; anything else is never echoed. */
const SAFE_CODE = /^[a-z0-9_]{1,80}$/;
const MAX_ISSUES = 10;

function isDomainType(value: unknown): value is McpToolErrorType {
  return DOMAIN_ERROR_TYPES.some((type) => type === value);
}

function safeCode(message: unknown, fallback: string): string {
  return typeof message === "string" && SAFE_CODE.test(message)
    ? message
    : fallback;
}

/**
 * Maps any thrown value to a safe tool error. Input values, stack traces,
 * database messages and secrets are never copied into the payload.
 */
export function toToolErrorPayload(error: unknown): McpToolErrorPayload {
  if (error instanceof McpToolError)
    return {
      type: error.type,
      code: safeCode(error.code, "tool_error"),
      hint: HINTS[error.type],
    };
  if (error instanceof z.ZodError)
    return {
      type: "validation_error",
      code: "invalid_input",
      hint: HINTS.validation_error,
      issues: error.issues.slice(0, MAX_ISSUES).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message.slice(0, 120),
      })),
    };
  if (typeof error === "object" && error !== null) {
    const type: unknown = "type" in error ? error.type : undefined;
    const message: unknown = "message" in error ? error.message : undefined;
    if (isDomainType(type))
      return {
        type,
        code: safeCode(message, type),
        hint: HINTS[type],
      };
    if (
      error instanceof Error &&
      error.message.startsWith("variant_generation_")
    )
      return {
        type: "validation_error",
        code: safeCode(error.message, "variant_generation_invalid"),
        hint: HINTS.validation_error,
      };
  }
  return {
    type: "internal_error",
    code: "internal_error",
    hint: HINTS.internal_error,
  };
}

export function isUnexpectedToolError(payload: McpToolErrorPayload): boolean {
  return payload.type === "internal_error";
}
