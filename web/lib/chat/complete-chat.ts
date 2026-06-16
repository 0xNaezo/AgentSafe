import { callOpenRouter } from "./openrouter";
import { extractToolCalls } from "./tool-calls";
import { executeToolCall } from "./tool-executor";
import type {
  ChatCompletionResult,
  ChatExecutionContext,
  ChatMessage,
  ToolCallResult,
} from "./types";

const MAX_TOOL_CALL_ITERATIONS = 10;

function summarizeToolResults(messages: ChatMessage[]) {
  const toolResults = messages
    .filter((message) => message.role === "tool" && message.content)
    .map((message) => message.content);

  if (toolResults.length === 0) {
    return null;
  }

  const latestResult = toolResults.at(-1);
  if (!latestResult) {
    return null;
  }

  try {
    const parsed = JSON.parse(latestResult) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const result = parsed as Record<string, unknown>;
    if (result.executed === true && typeof result.signature === "string") {
      return `Payment executed. Transaction signature: ${result.signature}`;
    }

    if (result.executed === false && typeof result.reason === "string") {
      return `Payment was not executed: ${result.reason}`;
    }
  } catch {
    return null;
  }

  return null;
}

export async function completeChat(
  messages: ChatMessage[],
  executionContext: ChatExecutionContext,
): Promise<ChatCompletionResult> {
  const allToolCalls: ToolCallResult[] = [];
  let iteration = 0;

  while (iteration < MAX_TOOL_CALL_ITERATIONS) {
    iteration++;

    const { choice, ok, status, errorBody } = await callOpenRouter(messages);

    if (!ok) {
      console.error("OpenRouter error:", status, errorBody);
      const fallbackReply = summarizeToolResults(messages);

      if (fallbackReply) {
        return {
          reply: fallbackReply,
          toolCalls: allToolCalls,
          messages,
        };
      }

      throw new Error(`OpenRouter API error: ${status}`);
    }

    if (!choice) {
      return {
        reply: "No response from model",
        toolCalls: allToolCalls,
        messages,
      };
    }

    if (choice.finish_reason === "stop") {
      messages.push({
        role: "assistant",
        content: choice.message.content,
      });

      return {
        reply: choice.message.content ?? "",
        toolCalls: allToolCalls,
        messages,
      };
    }

    if (choice.finish_reason === "tool_calls") {
      const toolCalls = choice.message.tool_calls ?? [];

      messages.push({
        role: "assistant",
        content: choice.message.content,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const toolResult = await executeToolCall(tc, executionContext);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }

      allToolCalls.push(...extractToolCalls(choice));
      continue;
    }

    messages.push({
      role: "assistant",
      content: choice.message.content,
    });

    return {
      reply: choice.message.content ?? "",
      toolCalls: allToolCalls,
      messages,
    };
  }

  return {
    reply: "Reached maximum number of tool call iterations.",
    toolCalls: allToolCalls,
    messages,
  };
}
