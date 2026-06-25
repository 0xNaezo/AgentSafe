import { NextResponse } from "next/server";
import { completeChat } from "@/lib/chat/complete-chat";
import {
  chatRequestBodySchema,
  chatRequestMessageSchema,
} from "@/lib/chat/schemas";
import type { ChatMessage, MessageContent } from "@/lib/chat/types";
import { checkAuth } from "./check-auth";
import { parseExecutionContext } from "./parse-context";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 120_000;

function getTextContentLength(content: MessageContent): number {
  if (content === null || content === undefined) {
    return 0;
  }

  if (typeof content === "string") {
    return content.length;
  }

  // For multimodal content arrays, only count text parts
  let length = 0;

  for (const part of content) {
    if (part.type === "text") {
      length += part.text.length;
    }
  }

  return length;
}

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
    return { ok: false, error: "Invalid message format", status: 400 };
  }

  const messages: ChatMessage[] = [];
  let totalChars = 0;

  for (const message of messagesResult.data) {
    const contentLength = getTextContentLength(message.content);
    if (contentLength > MAX_MESSAGE_CHARS) {
      return { ok: false, error: "Message content is too large", status: 413 };
    }

    totalChars += contentLength;
    if (totalChars > MAX_TOTAL_CHARS) {
      return { ok: false, error: "Messages payload is too large", status: 413 };
    }

    messages.push(message as ChatMessage);
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

    const verifiedAuth = checkAuth(body.data.auth);

    if (!verifiedAuth.ok) {
      return NextResponse.json(
        { error: verifiedAuth.error },
        { status: verifiedAuth.status },
      );
    }

    const executionContext = parseExecutionContext(body.data.context);

    if (!executionContext.ok) {
      return NextResponse.json(
        { error: executionContext.error },
        { status: executionContext.status },
      );
    }

    if (
      !executionContext.context.owner.equals(verifiedAuth.context.owner) ||
      !executionContext.context.tokenMint.equals(verifiedAuth.context.tokenMint)
    ) {
      return NextResponse.json(
        { error: "Context does not match authenticated wallet" },
        { status: 403 },
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 503 },
      );
    }

    const result = await completeChat(
      parsedMessages.messages,
      verifiedAuth.context,
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
