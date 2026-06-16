import { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { AnchorProgram } from "../../types/anchor_program";
import idl from "../solana/anchor-program-idl.json";
import { agentKeypair } from "./signer";

function createAnchorProgram(): Program<AnchorProgram> {
  const publicSolanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

  if (!publicSolanaRpcUrl) {
    throw new Error("NEXT_PUBLIC_SOLANA_RPC_URL is not set in .env.local.");
  }

  const connection = new Connection(publicSolanaRpcUrl);
  const agentWallet = {
    publicKey: agentKeypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(agentKeypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((tx) => tx.partialSign(agentKeypair));
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

export const program: Program<AnchorProgram> = createAnchorProgram();
