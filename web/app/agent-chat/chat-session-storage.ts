import { CHAT_AUTH_TTL_MS } from "@/lib/chat/auth-message";
import type {
  ChatAuth,
  ChatMessage,
  HistoryMessage,
  InitialChatSession,
  StoredChatSession,
} from "./types";

const CHAT_SESSION_STORAGE_PREFIX = "agentsafe:agent-chat:";

/**
 * Generates a session storage key for the given owner and token mint.
 *
 * @param owner - The owner identifier
 * @param tokenMint - The token mint identifier
 * @returns The session storage key string
 */
export function getChatSessionStorageKey(owner: string, tokenMint: string) {
  return `${CHAT_SESSION_STORAGE_PREFIX}${owner}:${tokenMint}`;
}

/**
 * Attempts to persist a chat session to browser storage.
 *
 * @param key - The storage key where the session will be stored
 * @param session - The chat session to persist
 */
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

/**
 * Validates that chat authentication has not expired.
 *
 * @param auth - The authentication object to check, or `null`
 * @param now - The current timestamp in milliseconds
 * @returns `true` if `auth` is non-null and has not expired, `false` otherwise
 */
export function isChatAuthValid(auth: ChatAuth | null, now: number) {
  return auth !== null && auth.issuedAt + CHAT_AUTH_TTL_MS > now;
}

/**
 * Loads a persisted chat session from storage or returns an empty initial session.
 *
 * If required parameters are missing, the stored session does not exist, or stored
 * data fails validation, returns an empty session.
 *
 * @param storageKey - The storage key for the session
 * @param owner - The session owner identifier
 * @param tokenMint - The token mint identifier
 * @returns An `InitialChatSession` containing loaded or empty messages, history, and auth
 */
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

/**
 * Retrieves a value from session storage.
 *
 * @param key - The storage key to retrieve
 * @returns The stored string value, or null if an error occurs
 */
function readStoredChatSession(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Parses and validates a stored chat session string.
 *
 * Validates that the parsed session matches the provided `owner` and `tokenMint`, contains valid `messages` and `history` arrays, and has a chat auth that passes TTL validation. Invalid or missing fields are filtered or replaced with `null`.
 *
 * @param value - JSON string representation of a stored chat session
 * @param owner - The expected session owner, used to validate the session data
 * @param tokenMint - The expected token mint, used to validate the session data
 * @param now - The current timestamp, used to validate the chat auth expiration
 * @returns The validated session object with filtered messages and history, or `null` if parsing or validation fails
 */
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

/**
 * Determines if a value conforms to the ChatMessage structure.
 *
 * @returns `true` if the value is a ChatMessage, `false` otherwise.
 */
function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Partial<ChatMessage>;
  return (
    typeof message.author === "string" &&
    typeof message.body === "string" &&
    (message.align === "left" || message.align === "right") &&
    (message.kind === "user" ||
      message.kind === "agent" ||
      message.kind === "tool")
  );
}

/**
 * Determines if a value is a valid history message.
 *
 * @returns `true` if the value is a valid history message, `false` otherwise.
 */
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

/**
 * Determines if a value is a ChatAuth object.
 *
 * @returns `true` if the value is a ChatAuth object, `false` otherwise.
 */
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
