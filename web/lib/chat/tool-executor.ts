import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import { executePaymentWithAgent } from "../agent/execute-payment";
import { program } from "../agent/program";
import { parseTokenAmount } from "../solana/amounts";
import type { ChatExecutionContext, ToolCall } from "./types";

type ToolExecutionResult =
  | {
      executed: true;
      signature: string;
      tool: "execute_payment";
      recipient: string;
      amount: string;
    }
  | {
      executed: false;
      reason: string;
    };

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Payment execution failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseToolArguments(rawArguments: string) {
  try {
    const parsed = JSON.parse(rawArguments) as unknown;

    if (!isRecord(parsed)) {
      return { ok: false as const, error: "Tool arguments must be an object" };
    }

    return { ok: true as const, args: parsed };
  } catch {
    return { ok: false as const, error: "Tool arguments must be valid JSON" };
  }
}

function parseRecipient(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "address must be a string" };
  }

  try {
    return { ok: true as const, recipient: new PublicKey(value) };
  } catch {
    return { ok: false as const, error: "address must be a valid public key" };
  }
}

function validateRecipientOwner(recipient: PublicKey) {
  if (!PublicKey.isOnCurve(recipient.toBuffer())) {
    return {
      ok: false as const,
      error: "recipient must be a standard wallet address, not a PDA",
    };
  }

  return { ok: true as const };
}

function parseAmount(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "amount must be a string" };
  }

  return { ok: true as const, amount: value };
}

export async function executeToolCall(
  toolCall: ToolCall,
  context: ChatExecutionContext,
): Promise<ToolExecutionResult> {
  if (toolCall.type !== "function") {
    return { executed: false, reason: "unsupported_tool_type" };
  }

  if (toolCall.function.name !== "execute_payment") {
    return { executed: false, reason: "unsupported_tool_name" };
  }

  const parsedArguments = parseToolArguments(toolCall.function.arguments);
  if (!parsedArguments.ok) {
    return { executed: false, reason: parsedArguments.error };
  }

  const recipient = parseRecipient(parsedArguments.args.address);
  if (!recipient.ok) {
    return { executed: false, reason: recipient.error };
  }

  const validRecipientOwner = validateRecipientOwner(recipient.recipient);
  if (!validRecipientOwner.ok) {
    return { executed: false, reason: validRecipientOwner.error };
  }

  const amount = parseAmount(parsedArguments.args.amount);
  if (!amount.ok) {
    return { executed: false, reason: amount.error };
  }

  try {
    const mint = await getMint(
      program.provider.connection,
      context.tokenMint,
      "confirmed",
      TOKEN_PROGRAM_ID,
    );
    const amountUnits = parseTokenAmount(amount.amount, mint.decimals);

    if (amountUnits.toString() === "0") {
      return { executed: false, reason: "amount must be greater than zero" };
    }

    const signature = await executePaymentWithAgent(
      context.owner,
      context.tokenMint,
      recipient.recipient,
      amountUnits,
    );

    return {
      executed: true,
      signature,
      tool: "execute_payment",
      recipient: recipient.recipient.toBase58(),
      amount: amount.amount,
    };
  } catch (error) {
    console.error("Payment tool execution failed:", error);
    return { executed: false, reason: getErrorMessage(error) };
  }
}
