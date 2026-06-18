import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  buildChatAuthMessage,
  CHAT_AUTH_MESSAGE_FIELDS,
  CHAT_AUTH_MESSAGE_LINE_COUNT,
  CHAT_AUTH_MESSAGE_PREFIX,
  readChatAuthMessageField,
} from "@/lib/chat/auth-message";
import { authSchema } from "@/lib/chat/schemas";
import type { ChatExecutionContext } from "@/lib/chat/types";

const CHAT_AUTH_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 1000;

type CheckAuthResult =
  | { ok: true; context: ChatExecutionContext }
  | { ok: false; error: string; status: number };

type ParsedSignedMessage = {
  owner: PublicKey;
  tokenMint: PublicKey;
  issuedAt: number;
};

function parseSignedMessage(message: string): ParsedSignedMessage | null {
  const lines = message.split("\n");

  if (
    lines.length !== CHAT_AUTH_MESSAGE_LINE_COUNT ||
    lines[0] !== CHAT_AUTH_MESSAGE_PREFIX
  ) {
    return null;
  }

  const owner = readChatAuthMessageField(
    lines[1],
    CHAT_AUTH_MESSAGE_FIELDS.owner,
  );
  const tokenMint = readChatAuthMessageField(
    lines[2],
    CHAT_AUTH_MESSAGE_FIELDS.tokenMint,
  );
  const issuedAtValue = readChatAuthMessageField(
    lines[3],
    CHAT_AUTH_MESSAGE_FIELDS.issuedAt,
  );

  if (!owner || !tokenMint || !issuedAtValue) {
    return null;
  }

  const issuedAt = Number(issuedAtValue);
  if (!Number.isSafeInteger(issuedAt) || issuedAt < 0) {
    return null;
  }

  if (message !== buildChatAuthMessage(owner, tokenMint, issuedAt)) {
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

  if (signatureBytes.length !== 64) {
    return { ok: false, error: "Invalid auth signature", status: 400 };
  }

  let signatureIsValid: boolean;
  try {
    signatureIsValid = ed25519.verify(
      signatureBytes,
      new TextEncoder().encode(signedMessage),
      parsedMessage.owner.toBytes(),
    );
  } catch {
    return { ok: false, error: "Invalid auth signature", status: 400 };
  }

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
