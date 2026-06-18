import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { authSchema } from "@/lib/chat/schemas";
import type { ChatExecutionContext } from "@/lib/chat/types";

const CHAT_AUTH_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 1000;
const SIGNED_MESSAGE_PREFIX = "AgentSafe Chat Auth";

type CheckAuthResult =
  | { ok: true; context: ChatExecutionContext }
  | { ok: false; error: string; status: number };

type ParsedSignedMessage = {
  owner: PublicKey;
  tokenMint: PublicKey;
  issuedAt: number;
};

/**
 * Parses a signed message string into structured authorization fields.
 *
 * @param message - The signed message string to parse
 * @returns A `ParsedSignedMessage` with extracted owner, token mint, and timestamp, or `null` if the message format is invalid
 */
function parseSignedMessage(message: string): ParsedSignedMessage | null {
  const lines = message.split("\n");

  if (lines.length !== 4 || lines[0] !== SIGNED_MESSAGE_PREFIX) {
    return null;
  }

  const owner = readSignedMessageField(lines[1], "Owner");
  const tokenMint = readSignedMessageField(lines[2], "TokenMint");
  const issuedAtValue = readSignedMessageField(lines[3], "IssuedAt");

  if (!owner || !tokenMint || !issuedAtValue) {
    return null;
  }

  const issuedAt = Number(issuedAtValue);
  if (!Number.isSafeInteger(issuedAt) || issuedAt < 0) {
    return null;
  }

  try {
    return {
      owner: new PublicKey(owner),
      tokenMint: new PublicKey(tokenMint),
      issuedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a field value from a line formatted as `field: value`.
 *
 * @param line - The line to parse
 * @param field - The name of the field to extract
 * @returns The field value if the line starts with `${field}: `, `null` otherwise
 */
function readSignedMessageField(line: string, field: string) {
  const prefix = `${field}: `;

  if (!line.startsWith(prefix)) {
    return null;
  }

  return line.slice(prefix.length);
}

/**
 * Validates and authenticates a chat authorization payload.
 *
 * @param authInput - The authorization payload to validate
 * @returns `{ ok: true, context: { owner, tokenMint } }` on success, or `{ ok: false, error, status }` on failure with an HTTP-like status code
 */
export function checkAuth(authInput: unknown): CheckAuthResult {
  const auth = authSchema.safeParse(authInput);

  if (!auth.success) {
    return { ok: false, error: "Invalid auth payload", status: 400 };
  }

  const { issuedAt, signedMessage, signature } = auth.data;
  const parsedMessage = parseSignedMessage(signedMessage);

  if (!parsedMessage) {
    return { ok: false, error: "Invalid signed auth message", status: 400 };
  }

  if (parsedMessage.issuedAt !== issuedAt) {
    return { ok: false, error: "Auth timestamp mismatch", status: 400 };
  }

  const now = Date.now();
  if (issuedAt > now + CLOCK_SKEW_MS) {
    return { ok: false, error: "Auth timestamp is in the future", status: 401 };
  }

  if (issuedAt <= now - CHAT_AUTH_TTL_MS) {
    return { ok: false, error: "Chat authorization expired", status: 401 };
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = bs58.decode(signature);
  } catch {
    return { ok: false, error: "Invalid auth signature", status: 400 };
  }

  const signatureIsValid = ed25519.verify(
    signatureBytes,
    new TextEncoder().encode(signedMessage),
    parsedMessage.owner.toBytes(),
  );

  if (!signatureIsValid) {
    return { ok: false, error: "Invalid auth signature", status: 401 };
  }

  return {
    ok: true,
    context: {
      owner: parsedMessage.owner,
      tokenMint: parsedMessage.tokenMint,
    },
  };
}
