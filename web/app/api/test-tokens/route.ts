import { NextResponse } from "next/server";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { parseTokenAmount } from "@/lib/solana/amounts";
import { DEMO_TOKEN_MINT, RPC_URL } from "@/lib/solana/config";
import { getAgentKeypair } from "@/lib/agent/signer";

const TEST_TOKEN_AMOUNT = "1000";

type TestTokensRequest = {
  recipient?: unknown;
};

function parsePublicKey(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${name} is required`);
  }

  try {
    return new PublicKey(value.trim());
  } catch {
    throw new BadRequestError(`${name} is invalid`);
  }
}

class BadRequestError extends Error {}

export async function POST(request: Request) {
  try {
    let body: TestTokensRequest;

    try {
      body = (await request.json()) as TestTokensRequest;
    } catch {
      throw new BadRequestError("Invalid JSON");
    }

    const recipient = parsePublicKey(body.recipient, "recipient");
    const tokenMint = parsePublicKey(DEMO_TOKEN_MINT, "NEXT_PUBLIC_DEMO_TOKEN_MINT");
    const agentKeypair = getAgentKeypair();
    const connection = new Connection(RPC_URL, "confirmed");
    const mint = await getMint(connection, tokenMint);
    const amount = parseTokenAmount(TEST_TOKEN_AMOUNT, mint.decimals);
    const rawAmount = BigInt(amount.toString());

    const agentTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      agentKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
    );
    const recipientTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
    );

    try {
      await getAccount(connection, agentTokenAccount);
    } catch {
      return NextResponse.json(
        { error: "Agent token account does not exist or has no test tokens." },
        { status: 409 },
      );
    }

    const transaction = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        agentKeypair.publicKey,
        recipientTokenAccount,
        recipient,
        tokenMint,
        TOKEN_PROGRAM_ID,
      ),
      createTransferCheckedInstruction(
        agentTokenAccount,
        tokenMint,
        recipientTokenAccount,
        agentKeypair.publicKey,
        rawAmount,
        mint.decimals,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const signature = await connection.sendTransaction(transaction, [
      agentKeypair,
    ]);
    await connection.confirmTransaction(signature, "confirmed");

    return NextResponse.json({
      amount: TEST_TOKEN_AMOUNT,
      recipientTokenAccount: recipientTokenAccount.toBase58(),
      signature,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Test tokens API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send test tokens.",
      },
      { status: 500 },
    );
  }
}
