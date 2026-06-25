import { callOpenRouter } from "./openrouter";
import { toolResultSummarySchema } from "./schemas";
import { extractToolCalls } from "./tool-calls";
import { executeToolCall } from "./tool-executor";
import type {
  ChatCompletionResult,
  ChatExecutionContext,
  ChatMessage,
  OwnerApprovalRequest,
  ToolCallResult,
} from "./types";

const MAX_TOOL_CALL_ITERATIONS = 10;

function summarizeToolResults(messages: ChatMessage[]) {
  const toolResults = messages
    .filter((message) => message.role === "tool" && message.content)
    .map((message) => message.content as string);

  if (toolResults.length === 0) {
    return null;
  }

  const latestResult = toolResults.at(-1);
  if (!latestResult) {
    return null;
  }

  try {
    const parsed = JSON.parse(latestResult) as unknown;
    const result = toolResultSummarySchema.safeParse(parsed);

    if (!result.success) {
      return null;
    }

    if (result.data.executed) {
      return `Payment executed. Transaction signature: ${result.data.signature}`;
    }

    if ("requiresOwnerApproval" in result.data) {
      return "Payment requires owner approval because it exceeds the one-time limit.";
    }

    return `Payment was not executed: ${result.data.reason}`;
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
  const approvalRequests: OwnerApprovalRequest[] = [];
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
          approvalRequests,
          messages,
        };
      }

      throw new Error(`OpenRouter API error: ${status}`);
    }

    if (!choice) {
      return {
        reply: "No response from model",
        toolCalls: allToolCalls,
        approvalRequests,
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
        approvalRequests,
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

        if (
          "requiresOwnerApproval" in toolResult &&
          toolResult.requiresOwnerApproval
        ) {
          approvalRequests.push({
            type: toolResult.approvalType,
            reason: toolResult.reason,
            recipient: toolResult.recipient,
            amount: toolResult.amount,
            tokenMint: toolResult.tokenMint,
          });
        }

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
      approvalRequests,
      messages,
    };
  }

  return {
    reply: "Reached maximum number of tool call iterations.",
    toolCalls: allToolCalls,
    approvalRequests,
    messages,
  };
}
