import { getDictionary } from "@/dictionary/services/get-dictionary";
import type {
  GetPromptResult,
  Prompt,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpActor } from "./mcp_auth";
import { actorHasScope } from "./mcp_tool_runner";
import type { McpToolDefinition } from "./mcp_tool_types";

type PromptCopy = ReturnType<typeof getDictionary>["admin"]["mcpPrompts"];
type PromptKey = Exclude<keyof PromptCopy, "withArgument">;

interface PromptEntry {
  key: PromptKey;
  /** Scope a token needs to follow the recipe (writes need `write`). */
  scope: McpToolDefinition["scope"];
}

/** Guided recipes. Their Spanish text lives in `admin.mcpPrompts`. */
const PROMPTS: readonly PromptEntry[] = [
  { key: "firstProduct", scope: "write" },
  { key: "reviewLowStock", scope: "read" },
  { key: "manualOrder", scope: "write" },
  { key: "publishProduct", scope: "write" },
];

const MAX_ARGUMENT_LENGTH = 200;

function copy(): PromptCopy {
  return getDictionary("es").admin.mcpPrompts;
}

/** Single line, bounded: it is user-supplied text embedded in a prompt. */
function cleanArgument(value: string | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ARGUMENT_LENGTH);
}

/** Recipes a token can follow: write recipes are hidden from read-only tokens. */
function promptsForActor(actor: Pick<McpActor, "scopes">): PromptEntry[] {
  return PROMPTS.filter((entry) => actorHasScope(actor, entry));
}

export function listMcpPrompts(actor: Pick<McpActor, "scopes">): Prompt[] {
  const texts = copy();
  return promptsForActor(actor).map((entry) => {
    const text = texts[entry.key];
    return {
      name: text.name,
      title: text.title,
      description: text.description,
      arguments: text.argumentName
        ? [
            {
              name: text.argumentName,
              description: text.argumentDescription,
              required: false,
            },
          ]
        : [],
    };
  });
}

/** Returns undefined for an unknown prompt or one outside the token's scopes. */
export function getMcpPrompt(
  actor: Pick<McpActor, "scopes">,
  name: string,
  args: Record<string, string> | undefined,
): GetPromptResult | undefined {
  const texts = copy();
  const entry = promptsForActor(actor).find(
    (candidate) => texts[candidate.key].name === name,
  );
  if (!entry) return undefined;
  const text = texts[entry.key];
  const value = text.argumentName
    ? cleanArgument(args?.[text.argumentName])
    : "";
  const message = value
    ? `${text.message}\n\n${texts.withArgument.replace("{value}", value)}`
    : text.message;
  return {
    description: text.description,
    messages: [{ role: "user", content: { type: "text", text: message } }],
  };
}
