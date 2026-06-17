import { PublicKey } from "@solana/web3.js";
import { BN } from "@anchor-lang/core";
import { deriveVaultPda, deriveVaultTokenAccountPda } from "../solana/pda";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAgentPubkey } from "./signer";
import { getAnchorProgram } from "./program";

export async function executePaymentWithAgent(
  owner: PublicKey,
  tokenMint: PublicKey,
  recipient: PublicKey,
  amount: BN,
): Promise<string> {
  const [vaultPda] = deriveVaultPda(owner, tokenMint);
  const [vaultTokenAccountPda] = deriveVaultTokenAccountPda(vaultPda);
  const agentPubkey = getAgentPubkey();
  const program = getAnchorProgram();

  const recipientAta = getAssociatedTokenAddressSync(
    tokenMint,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
  );

  const signature = await program.methods
    .executePayment(amount)
    .accountsStrict({
      agent: agentPubkey,
      vaultState: vaultPda,
      vaultTokenAccount: vaultTokenAccountPda,
      toTokenAccount: recipientAta,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        agentPubkey,
        recipientAta,
        recipient,
        tokenMint,
      ),
    ])
    .rpc();

  return signature;
}
