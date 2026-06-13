import type { OpenRouterChoice, ToolCallResult } from "./types";

export function extractToolCalls(choice: OpenRouterChoice): ToolCallResult[] {
  const toolCalls = choice.message.tool_calls;
  if (!toolCalls) return [];

  const results: ToolCallResult[] = [];

  for (const tc of toolCalls) {
    if (tc.type !== "function") continue;

    const toolFunction = tc.function;
    if (
      !toolFunction ||
      typeof toolFunction.name !== "string" ||
      typeof toolFunction.arguments !== "string"
    ) {
      continue;
    }

    try {
      const parsedArgs = JSON.parse(toolFunction.arguments) as unknown;
      if (!parsedArgs || typeof parsedArgs !== "object" || Array.isArray(parsedArgs)) {
        continue;
      }

      results.push({
        name: toolFunction.name,
        args: parsedArgs as Record<string, unknown>,
      });
    } catch (error) {
      console.warn("Skipping malformed tool call arguments:", error);
    }
  }

  return results;
}
