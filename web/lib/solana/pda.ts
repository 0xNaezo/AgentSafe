import { PublicKey } from "@solana/web3.js";

import { PROGRAM_ID } from "./config";

const VAULT_SEED = "vault";
const TOKEN_VAULT_SEED = "token_vault";

export function deriveVaultPda(owner: PublicKey, tokenMint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer(), tokenMint.toBuffer()],
    PROGRAM_ID,
  );
}

export function deriveVaultTokenAccountPda(vaultState: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_VAULT_SEED), vaultState.toBuffer()],
    PROGRAM_ID,
  );
}
