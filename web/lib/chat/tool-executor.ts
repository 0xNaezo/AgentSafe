import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import { executePaymentWithAgent } from "../agent/execute-payment";
import { getAnchorProgram } from "../agent/program";
import { parseTokenAmount } from "../solana/amounts";
import { deriveVaultPda } from "../solana/pda";
import { executePaymentToolArgsSchema } from "./schemas";
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
      requiresOwnerApproval: true;
      approvalType: "owner_force_transfer";
      reason: "onetime_limit_exceeded";
      recipient: string;
      amount: string;
      tokenMint: string;
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

function parseToolArguments(rawArguments: string) {
  try {
    const parsed = JSON.parse(rawArguments) as unknown;
    const args = executePaymentToolArgsSchema.safeParse(parsed);

    if (!args.success) {
      const issue = args.error.issues[0];
      const field = issue?.path[0];

      if (field === "address" || field === "amount") {
        const error =
          issue.code === "invalid_type"
            ? `${field} must be a string`
            : issue.message;

        return { ok: false as const, error };
      }

      return { ok: false as const, error: "Tool arguments must be an object" };
    }

    return { ok: true as const, args: args.data };
  } catch {
    return { ok: false as const, error: "Tool arguments must be valid JSON" };
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

function isDecimalStringGreater(left: string, right: string) {
  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length;
  }

  return normalizedLeft > normalizedRight;
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

  const validRecipientOwner = validateRecipientOwner(
    parsedArguments.args.address,
  );
  if (!validRecipientOwner.ok) {
    return { executed: false, reason: validRecipientOwner.error };
  }

  try {
    const program = getAnchorProgram();
    const mint = await getMint(
      program.provider.connection,
      context.tokenMint,
      "confirmed",
      TOKEN_PROGRAM_ID,
    );
    const amountUnits = parseTokenAmount(
      parsedArguments.args.amount,
      mint.decimals,
    );

    if (amountUnits.toString() === "0") {
      return { executed: false, reason: "amount must be greater than zero" };
    }

    const [vaultPda] = deriveVaultPda(context.owner, context.tokenMint);
    const vault = await program.account.vault.fetchNullable(vaultPda);

    if (!vault) {
      return { executed: false, reason: "vault account was not found" };
    }

    if (
      isDecimalStringGreater(
        amountUnits.toString(),
        vault.onetimeLimit.toString(),
      )
    ) {
      return {
        executed: false,
        requiresOwnerApproval: true,
        approvalType: "owner_force_transfer",
        reason: "onetime_limit_exceeded",
        recipient: parsedArguments.args.address.toBase58(),
        amount: parsedArguments.args.amount,
        tokenMint: context.tokenMint.toBase58(),
      };
    }

    const signature = await executePaymentWithAgent(
      context.owner,
      context.tokenMint,
      parsedArguments.args.address,
      amountUnits,
    );

    return {
      executed: true,
      signature,
      tool: "execute_payment",
      recipient: parsedArguments.args.address.toBase58(),
      amount: parsedArguments.args.amount,
    };
  } catch (error) {
    console.error("Payment tool execution failed:", error);
    return { executed: false, reason: getErrorMessage(error) };
  }
}
