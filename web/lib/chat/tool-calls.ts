import { executePaymentToolArgsSchema, toolCallArgsSchema } from "./schemas";
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

      if (toolFunction.name === "execute_payment") {
        const args = executePaymentToolArgsSchema.safeParse(parsedArgs);

        if (!args.success) {
          continue;
        }

        results.push({
          name: toolFunction.name,
          args: {
            amount: args.data.amount,
            address: args.data.address.toBase58(),
          },
        });
        continue;
      }

      const args = toolCallArgsSchema.safeParse(parsedArgs);

      if (!args.success) {
        continue;
      }

      results.push({
        name: toolFunction.name,
        args: args.data,
      });
    } catch (error) {
      console.warn("Skipping malformed tool call arguments:", error);
    }
  }

  return results;
}
