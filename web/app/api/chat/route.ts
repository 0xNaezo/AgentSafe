import { NextResponse } from "next/server";
import { completeChat } from "@/lib/chat/complete-chat";
import type { ChatMessage } from "@/lib/chat/types";

type ChatRequestBody = {
  messages?: unknown;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<ChatMessage>;
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "tool") &&
    (typeof message.content === "string" || message.content === null)
  );
}

function parseMessages(body: ChatRequestBody) {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return null;
  }

  if (!body.messages.every(isChatMessage)) {
    return null;
  }

  return body.messages;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const messages = parseMessages(body);

    if (!messages) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 503 });
    }

    const result = await completeChat(messages);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);

    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.startsWith("OpenRouter API error") ? 502 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
