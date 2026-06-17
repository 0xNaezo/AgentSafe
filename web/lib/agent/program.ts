import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { AnchorProgram } from "../../types/anchor_program";
import idl from "../solana/anchor-program-idl.json";
import { getAgentKeypair } from "./signer";

type AgentTransaction = Transaction | VersionedTransaction;

let program: Program<AnchorProgram> | null = null;

function isVersionedTransaction(
  tx: AgentTransaction,
): tx is VersionedTransaction {
  return "version" in tx;
}

function createAnchorProgram(): Program<AnchorProgram> {
  const publicSolanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  if (!publicSolanaRpcUrl) {
    throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL is not set in .env.local.");
  }

  const connection = new Connection(publicSolanaRpcUrl);
  const agentKeypair = getAgentKeypair();
  const agentWallet = {
    publicKey: agentKeypair.publicKey,
    signTransaction: async <T extends AgentTransaction>(tx: T): Promise<T> => {
      if (isVersionedTransaction(tx)) {
        tx.sign([agentKeypair]);
      } else {
        tx.partialSign(agentKeypair);
      }

      return tx;
    },
    signAllTransactions: async <T extends AgentTransaction>(
      txs: T[],
    ): Promise<T[]> => {
      txs.forEach((tx) => {
        if (isVersionedTransaction(tx)) {
          tx.sign([agentKeypair]);
        } else {
          tx.partialSign(agentKeypair);
        }
      });

      return txs;
    },
  };

  const anchorProvider = new AnchorProvider(connection, agentWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });

  const program: Program<AnchorProgram> = new Program(
    idl as AnchorProgram,
    anchorProvider,
  );

  return program;
}

export function getAnchorProgram(): Program<AnchorProgram> {
  program ??= createAnchorProgram();
  return program;
}
