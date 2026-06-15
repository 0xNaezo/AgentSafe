"use client";

import { AnchorProvider, Program, type Idl } from "@anchor-lang/core";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useMemo } from "react";

import type { AnchorProgram } from "../../types/anchor_program";
import { idl } from "./config";

type BrowserAnchorWallet = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]>;
};

export type AgentSafeProgram = Program<AnchorProgram>;

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }

    const anchorWallet: BrowserAnchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };

    return new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);
}

export function useAgentSafeProgram() {
  const provider = useAnchorProvider();

  return useMemo(() => {
    if (!provider) {
      return null;
    }

    return new Program(idl as Idl, provider) as AgentSafeProgram;
  }, [provider]);
}
