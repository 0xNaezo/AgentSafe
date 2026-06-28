"use client";

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { TransactionInstruction } from "@solana/web3.js";
import type BN from "bn.js";

import type { AgentSafeProgram } from "./program";

export type VaultAccount = {
  owner: PublicKey;
  agent: PublicKey;
  tokenMint: PublicKey;
  vaultBump: number;
  dailyLimit: BN;
  hourlyLimit: BN;
  onetimeLimit: BN;
  spentToday: BN;
  spentHour: BN;
  lastResetTime: BN;
};

export type InitializeVaultInput = {
  agent: PublicKey;
  dailyLimit: BN;
  hourlyLimit: BN;
  owner: PublicKey;
  onetimeLimit: BN;
  tokenMint: PublicKey;
  vaultState: PublicKey;
  vaultTokenAccount: PublicKey;
};

export type UpdateVaultInput = {
  dailyLimit: BN;
  hourlyLimit: BN;
  onetimeLimit: BN;
  owner: PublicKey;
  vaultState: PublicKey;
};

export type OwnerForceTransferInput = {
  amount: BN;
  owner: PublicKey;
  preInstructions?: TransactionInstruction[];
  toTokenAccount: PublicKey;
  tokenMint: PublicKey;
  vaultState: PublicKey;
  vaultTokenAccount: PublicKey;
};

export async function fetchVault(
  program: AgentSafeProgram,
  vaultState: PublicKey,
) {
  return program.account.vault.fetchNullable(
    vaultState,
  ) as Promise<VaultAccount | null>;
}

export async function initializeVault(
  program: AgentSafeProgram,
  input: InitializeVaultInput,
): Promise<string> {
  return program.methods
    .initialize(input.dailyLimit, input.hourlyLimit, input.onetimeLimit)
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

export async function updateVault(
  program: AgentSafeProgram,
  input: UpdateVaultInput,
): Promise<string> {
  return program.methods
    .updateValue(input.dailyLimit, input.hourlyLimit, input.onetimeLimit)
    .accountsStrict({
      owner: input.owner,
      vaultState: input.vaultState,
    })
    .rpc();
}

export async function ownerForceTransfer(
  program: AgentSafeProgram,
  input: OwnerForceTransferInput,
): Promise<string> {
  return program.methods
    .ownerForceTransfer(input.amount)
    .accountsStrict({
      owner: input.owner,
      vaultState: input.vaultState,
      vaultTokenAccount: input.vaultTokenAccount,
      toTokenAccount: input.toTokenAccount,
      tokenMint: input.tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions(input.preInstructions ?? [])
    .rpc();
}
