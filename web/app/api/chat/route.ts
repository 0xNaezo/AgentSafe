import { NextResponse } from "next/server";

type ToolCallResult = {
  name: string;
  args: Record<string, unknown>;
};

type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

const tools = [
  {
    type: "function" as const,
    function: {
      name: "transfer",
      description: "Transfer USDC to a recipient",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "string",
            description: "Amount of USDC to transfer",
          },
          address: {
            type: "string",
            description: "Recipient wallet address",
          },
        },
        required: ["amount", "address"],
      },
    },
  },
];

async function callOpenRouter(
  messages: ChatMessage[],
): Promise<{ choice: Record<string, unknown> | null; ok: boolean; status: number; errorBody: string }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AgentSafe",
    },
    body: JSON.stringify({ model: "deepseek/deepseek-v4-flash", messages, tools }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return { choice: null, ok: false, status: response.status, errorBody };
  }

  const data = await response.json();
  return { choice: data.choices?.[0] ?? null, ok: true, status: 200, errorBody: "" };
}

function extractToolCalls(choice: Record<string, unknown>): ToolCallResult[] {
  const message = choice.message as Record<string, unknown> | undefined;
  const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined;
  if (!toolCalls) return [];

  return toolCalls
    .filter((tc) => tc.type === "function")
    .map((tc) => ({
      name: (tc.function as Record<string, unknown>).name as string,
      args: JSON.parse((tc.function as Record<string, unknown>).arguments as string),
    }));
}

export async function POST(request: Request) {
  try {
    const { messages: incomingMessages } = await request.json();

    if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const messages: ChatMessage[] = incomingMessages;
    const allToolCalls: ToolCallResult[] = [];
    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const { choice, ok, status, errorBody } = await callOpenRouter(messages);

      if (!ok) {
        console.error("OpenRouter error:", status, errorBody);
        return NextResponse.json({ error: `OpenRouter API error: ${status}` }, { status: 502 });
      }

      if (!choice) {
        return NextResponse.json({ reply: "No response from model", toolCalls: allToolCalls, messages });
      }

      const choiceTyped = choice as {
        finish_reason: string;
        message: {
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
      };

      if (choiceTyped.finish_reason === "stop") {
        messages.push({
          role: "assistant",
          content: choiceTyped.message.content,
        });

        return NextResponse.json({
          reply: choiceTyped.message.content ?? "",
          toolCalls: allToolCalls,
          messages,
        });
      }

      if (choiceTyped.finish_reason === "tool_calls") {
        const toolCalls = choiceTyped.message.tool_calls ?? [];

        messages.push({
          role: "assistant",
          content: choiceTyped.message.content,
          tool_calls: toolCalls,
        });

        for (const tc of toolCalls) {
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: '{"success": true}',
          });
        }

        const extracted = extractToolCalls(choice as unknown as Record<string, unknown>);
        allToolCalls.push(...extracted);

        continue;
      }

      messages.push({
        role: "assistant",
        content: choiceTyped.message.content,
      });

      return NextResponse.json({
        reply: choiceTyped.message.content ?? "",
        toolCalls: allToolCalls,
        messages,
      });
    }

    return NextResponse.json({
      reply: "Reached maximum number of tool call iterations.",
      toolCalls: allToolCalls,
      messages,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
