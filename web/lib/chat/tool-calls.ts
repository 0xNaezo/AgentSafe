import type { OpenRouterChoice, ToolCallResult } from "./types";

export function extractToolCalls(choice: OpenRouterChoice): ToolCallResult[] {
  const toolCalls = choice.message.tool_calls;
  if (!toolCalls) return [];

  return toolCalls
    .filter((tc) => tc.type === "function")
    .map((tc) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));
}
