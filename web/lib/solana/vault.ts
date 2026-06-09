"use client";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type BN from "bn.js";

import type { AgentSafeProgram } from "./program";

export type VaultAccount = {
  owner: PublicKey;
  agent: PublicKey;
  tokenMint: PublicKey;
  vaultBump: number;
  dailyLimit: BN;
  onetimeLimit: BN;
  spentToday: BN;
  lastResetTime: BN;
};

export type InitializeVaultInput = {
  agent: PublicKey;
  dailyLimit: BN;
  owner: PublicKey;
  onetimeLimit: BN;
  tokenMint: PublicKey;
  vaultState: PublicKey;
  vaultTokenAccount: PublicKey;
};

export async function fetchVault(
  program: AgentSafeProgram,
  vaultState: PublicKey,
) {
  return program.account.vault.fetchNullable(vaultState) as Promise<VaultAccount | null>;
}

export async function initializeVault(
  program: AgentSafeProgram,
  input: InitializeVaultInput,
) {
  return program.methods
    .initialize(input.dailyLimit, input.onetimeLimit)
    .accountsStrict({
      owner: input.owner,
      agent: input.agent,
      tokenMint: input.tokenMint,
      vaultState: input.vaultState,
      vaultTokenAccount: input.vaultTokenAccount,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}
