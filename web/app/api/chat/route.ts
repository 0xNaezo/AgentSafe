import { NextResponse } from "next/server";
import { completeChat } from "@/lib/chat/complete-chat";
import type { ChatMessage } from "@/lib/chat/types";

type ChatRequestBody = {
  messages?: unknown;
};

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;

type ParseMessagesResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string; status: number };

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<ChatMessage>;
  return (
    (message.role === "user" || message.role === "assistant" || message.role === "tool") &&
    (typeof message.content === "string" || message.content === null)
  );
}

function parseMessages(body: ChatRequestBody): ParseMessagesResult {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, error: "Messages array is required", status: 400 };
  }

  if (body.messages.length > MAX_MESSAGES) {
    return { ok: false, error: "Messages array is too large", status: 413 };
  }

  const messages: ChatMessage[] = [];
  let totalChars = 0;

  for (const message of body.messages) {
    if (!isChatMessage(message)) {
      return { ok: false, error: "Messages array is required", status: 400 };
    }

    const contentLength = message.content?.length ?? 0;
    if (contentLength > MAX_MESSAGE_CHARS) {
      return { ok: false, error: "Message content is too large", status: 413 };
    }

    totalChars += contentLength;
    if (totalChars > MAX_TOTAL_CHARS) {
      return { ok: false, error: "Messages payload is too large", status: 413 };
    }

    messages.push(message);
  }

  return { ok: true, messages };
}

export async function POST(request: Request) {
  try {
    let body: ChatRequestBody;

    try {
      body = (await request.json()) as ChatRequestBody;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      throw error;
    }

    const parsedMessages = parseMessages(body);

    if (!parsedMessages.ok) {
      return NextResponse.json(
        { error: parsedMessages.error },
        { status: parsedMessages.status },
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 503 });
    }

    const result = await completeChat(parsedMessages.messages);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Error && error.message.startsWith("OpenRouter API error")) {
      return NextResponse.json({ error: "Upstream service error" }, { status: 502 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
