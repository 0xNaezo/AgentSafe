import { NextResponse } from "next/server";
import { completeChat } from "@/lib/chat/complete-chat";
import {
  chatRequestBodySchema,
  chatRequestMessageSchema,
} from "@/lib/chat/schemas";
import type { ChatMessage } from "@/lib/chat/types";
import { parseExecutionContext } from "./parse-context";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;

type ParseMessagesResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string; status: number };

function parseMessages(messagesInput: unknown): ParseMessagesResult {
  if (!Array.isArray(messagesInput) || messagesInput.length === 0) {
    return { ok: false, error: "Messages array is required", status: 400 };
  }

  if (messagesInput.length > MAX_MESSAGES) {
    return { ok: false, error: "Messages array is too large", status: 413 };
  }

  const messagesResult = chatRequestMessageSchema
    .array()
    .safeParse(messagesInput);

  if (!messagesResult.success) {
    return { ok: false, error: "Messages array is required", status: 400 };
  }

  const messages: ChatMessage[] = [];
  let totalChars = 0;

  for (const message of messagesResult.data) {
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
    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      throw error;
    }

    const body = chatRequestBodySchema.safeParse(rawBody);
    if (!body.success) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const parsedMessages = parseMessages(body.data.messages);

    if (!parsedMessages.ok) {
      return NextResponse.json(
        { error: parsedMessages.error },
        { status: parsedMessages.status },
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 503 },
      );
    }
    const executionContext = parseExecutionContext(body.data.context);

    if (!executionContext.ok) {
      return NextResponse.json(
        { error: executionContext.error },
        { status: executionContext.status },
      );
    }

    const result = await completeChat(
      parsedMessages.messages,
      executionContext.context,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);

    if (
      error instanceof Error &&
      error.message.startsWith("OpenRouter API error")
    ) {
      return NextResponse.json(
        { error: "Upstream service error" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
