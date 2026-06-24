import { CHAT_AUTH_TTL_MS } from "@/lib/chat/auth-message";
import type {
  ChatAuth,
  ChatBlink,
  ChatMessage,
  HistoryMessage,
  InitialChatSession,
  StoredChatSession,
} from "./types";

const CHAT_SESSION_STORAGE_PREFIX = "agentsafe:agent-chat:";

export function getChatSessionStorageKey(owner: string, tokenMint: string) {
  return `${CHAT_SESSION_STORAGE_PREFIX}${owner}:${tokenMint}`;
}

export function writeStoredChatSession(
  key: string,
  session: StoredChatSession,
) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Storage persistence is a UX convenience; chat should keep working without it.
  }
}

export function isChatAuthValid(auth: ChatAuth | null, now: number) {
  return auth !== null && auth.issuedAt + CHAT_AUTH_TTL_MS > now;
}

export function getInitialChatSession(
  storageKey: string | null,
  owner: string | null,
  tokenMint: string,
): InitialChatSession {
  if (!storageKey || !owner || !tokenMint) {
    return { messages: [], history: [], chatAuth: null };
  }

  const storedValue = readStoredChatSession(storageKey);
  if (!storedValue) {
    return { messages: [], history: [], chatAuth: null };
  }

  const session = parseStoredChatSession(
    storedValue,
    owner,
    tokenMint,
    Date.now(),
  );

  if (!session) {
    return { messages: [], history: [], chatAuth: null };
  }

  return {
    messages: session.messages,
    history: session.history,
    chatAuth: session.chatAuth,
  };
}

function readStoredChatSession(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseStoredChatSession(
  value: string,
  owner: string,
  tokenMint: string,
  now: number,
): StoredChatSession | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredChatSession>;

    if (
      parsed.owner !== owner ||
      parsed.tokenMint !== tokenMint ||
      !Array.isArray(parsed.messages) ||
      !Array.isArray(parsed.history)
    ) {
      return null;
    }

    const chatAuth = isChatAuth(parsed.chatAuth) ? parsed.chatAuth : null;

    return {
      owner,
      tokenMint,
      messages: parsed.messages.filter(isChatMessage),
      history: parsed.history.filter(isHistoryMessage),
      chatAuth: isChatAuthValid(chatAuth, now) ? chatAuth : null,
    };
  } catch {
    return null;
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Partial<ChatMessage>;
  const hasBaseShape =
    typeof message.author === "string" &&
    typeof message.body === "string" &&
    (message.align === "left" || message.align === "right");

  if (!hasBaseShape) {
    return false;
  }

  if (message.kind === "blink") {
    return isChatBlink(message.blink);
  }

  return (
    message.kind === "user" || message.kind === "agent" || message.kind === "tool"
  );
}

function isChatBlink(value: unknown): value is ChatBlink {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const blink = value as Partial<ChatBlink>;
  return (
    blink.type === "owner_force_transfer" &&
    blink.reason === "onetime_limit_exceeded" &&
    typeof blink.recipient === "string" &&
    typeof blink.amount === "string" &&
    typeof blink.tokenMint === "string"
  );
}

function isHistoryMessage(value: unknown): value is HistoryMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Partial<HistoryMessage>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    (typeof message.content === "string" || message.content === null)
  );
}

function isChatAuth(value: unknown): value is ChatAuth {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const auth = value as Partial<ChatAuth>;
  return (
    typeof auth.owner === "string" &&
    typeof auth.tokenMint === "string" &&
    typeof auth.signature === "string" &&
    typeof auth.signedMessage === "string" &&
    Number.isSafeInteger(auth.issuedAt) &&
    Number(auth.issuedAt) >= 0
  );
}
