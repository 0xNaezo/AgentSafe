import { PublicKey } from "@solana/web3.js";

import type { ChatExecutionContext } from "@/lib/chat/types";

export type ParseExecutionContextResult =
  | { ok: true; context: ChatExecutionContext }
  | { ok: false; error: string; status: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePublicKey(value: unknown, field: string) {
  if (typeof value !== "string") {
    return { ok: false as const, error: `${field} must be a string` };
  }

  try {
    return { ok: true as const, publicKey: new PublicKey(value) };
  } catch {
    return { ok: false as const, error: `${field} must be a valid public key` };
  }
}

export function parseExecutionContext(
  context: unknown,
): ParseExecutionContextResult {
  if (!isRecord(context)) {
    return { ok: false, error: "Context object is required", status: 400 };
  }

  const owner = parsePublicKey(context.owner, "owner");
  if (!owner.ok) {
    return { ok: false, error: owner.error, status: 400 };
  }

  const tokenMint = parsePublicKey(context.tokenMint, "tokenMint");
  if (!tokenMint.ok) {
    return { ok: false, error: tokenMint.error, status: 400 };
  }

  return {
    ok: true,
    context: {
      owner: owner.publicKey,
      tokenMint: tokenMint.publicKey,
    },
  };
}
