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

    const amount = requestUrl.searchParams.get("amount") || "0";
    const recipient = parsePublicKey(requestUrl.searchParams.get("to"), "to");
    const tokenMint = parsePublicKey(
      requestUrl.searchParams.get("tokenMint"),
      "tokenMint",
    );

    // Fetch vault state for dynamic policy-check values on the OG image
    let dailyLimit = "0";
    let dailyUsed = "0";
    let onetimeLimit = "0";

    const ownerParam = requestUrl.searchParams.get("owner");
    if (ownerParam) {
      try {
        const owner = new PublicKey(ownerParam);
        const [vaultPda] = deriveVaultPda(owner, tokenMint);
        const program = getAnchorProgram();
        const vault = await program.account.vault.fetchNullable(vaultPda);

        if (vault) {
          const v = vault as {
            dailyLimit: BN;
            onetimeLimit: BN;
            spentToday: BN;
            lastResetTime: BN;
          };

          // Epoch-aligned lazy-reset (mirrors on-chain logic)
          const now = Math.floor(Date.now() / 1000);
          const SECONDS_PER_DAY = 86_400;
          const currentDay = Math.floor(now / SECONDS_PER_DAY);
          const lastDay = Math.floor(v.lastResetTime.toNumber() / SECONDS_PER_DAY);
          const effectiveDaily = currentDay > lastDay ? 0 : v.spentToday.toNumber();

          const divider = 10 ** TOKEN_DECIMALS;
          dailyLimit = String(v.dailyLimit.toNumber() / divider);
          dailyUsed = String(effectiveDaily / divider);
          onetimeLimit = String(v.onetimeLimit.toNumber() / divider);
        }
      } catch (err) {
        console.warn("Vault fetch for OG image failed, proceeding without policy checks:", err);
      }
    }

    const ogUrl = new URL("/blinks/og", requestUrl.origin);
    ogUrl.searchParams.set("amount", amount);
    ogUrl.searchParams.set("to", recipient.toBase58());
    ogUrl.searchParams.set("dailyLimit", dailyLimit);
    ogUrl.searchParams.set("dailyUsed", dailyUsed);
    ogUrl.searchParams.set("onetimeLimit", onetimeLimit);

    const payload: ActionGetResponse = {
      type: "action",
      title: "AgentSafe: Approve Transfer",
      icon: ogUrl.toString(),
      description:
        "Note: This is a single-use action. Once confirmed on-chain, please ignore this card.",
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
