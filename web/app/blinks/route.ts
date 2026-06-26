import { getAnchorProgram } from "@/lib/agent/program";
import {
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  ActionPostResponse,
  createPostResponse,
} from "@solana/actions";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@anchor-lang/core";
import {
  deriveVaultPda,
  deriveVaultTokenAccountPda,
} from "../../lib/solana/pda";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const headers = createActionHeaders();
const TOKEN_DECIMALS = 9;

class BadRequestError extends Error {}

function jsonError(message: string, status = 400) {
  return Response.json({ message } satisfies ActionError, { status, headers });
}

function parsePublicKey(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestError(`${name} is required`);
  }

  try {
    return new PublicKey(value);
  } catch {
    throw new BadRequestError(`${name} is invalid`);
  }
}

function parseAmount(value: string | null) {
  if (!value || !/^\d+(\.\d{1,9})?$/.test(value)) {
    throw new BadRequestError("amount must be a positive USDC value");
  }

  const [integer, fraction = ""] = value.split(".");
  const paddedFraction = fraction
    .padEnd(TOKEN_DECIMALS, "0")
    .slice(0, TOKEN_DECIMALS);
  const units = new BN(integer + paddedFraction);

  if (units.isNeg()) {
    throw new BadRequestError("amount must be a positive USDC value");
  }

  return units;
}

function toUiAmount(amountStr: string, decimals: number): BN {
  const [integer, fraction = ""] = amountStr.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return new BN(integer + paddedFraction);
}

async function parseBody(req: Request): Promise<ActionPostRequest> {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object" || !("account" in body)) {
      throw new BadRequestError("account is required");
    }

    return body as ActionPostRequest;
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }

    throw new BadRequestError("Invalid JSON");
  }
}

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const amount = requestUrl.searchParams.get("amount") || 0;
    const recipient = parsePublicKey(requestUrl.searchParams.get("to"), "to");
    const tokenMint = parsePublicKey(
      requestUrl.searchParams.get("tokenMint"),
      "tokenMint",
    );

    const payload: ActionGetResponse = {
      type: "action",
      title: "AgentSafe: Force Transfer",
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      description: [
        "Agent exceeded the limit.",
        `- Address - ${recipient.toBase58()}`,
        `- Amount - ${amount} USDC`,
        `- Token mint - ${tokenMint.toBase58()}`,
        "",
        "Note: This is a single-use action. Once confirmed on-chain, please ignore this card",
      ].join("\n"),
      label: "Approve Transfer",
    };

    return Response.json(payload, { headers });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return jsonError(error.message);
    }

    console.error("Blink GET failed:", error);
    return jsonError("Unable to create action metadata", 500);
  }
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const amount = parseAmount(requestUrl.searchParams.get("amount"));

    const recipient = parsePublicKey(requestUrl.searchParams.get("to"), "to");
    const tokenMint = parsePublicKey(
      requestUrl.searchParams.get("tokenMint"),
      "tokenMint",
    );

    const body = await parseBody(req);
    const owner = parsePublicKey(body.account, "account");

    const [vaultPda] = deriveVaultPda(owner, tokenMint);
    const [vaultTokenAccountPda] = deriveVaultTokenAccountPda(vaultPda);

    const recipientAta = getAssociatedTokenAddressSync(
      tokenMint,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
    );

    const program = getAnchorProgram();

    const tx = await program.methods
      .ownerForceTransfer(amount)
      .accountsStrict({
        owner,
        vaultState: vaultPda,
        vaultTokenAccount: vaultTokenAccountPda,
        toTokenAccount: recipientAta,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          owner,
          recipientAta,
          recipient,
          tokenMint,
        ),
      ])
      .transaction();

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);

    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: tx,
        message: "Transfer approved by the owner!",
      },
    });

    return Response.json(payload, { headers });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return jsonError(error.message);
    }

    console.error("Blink POST failed:", error);
    return jsonError("Unable to create action transaction", 500);
  }
};
