import { PublicKey } from "@solana/web3.js";

import idl from "./anchor-program-idl.json";

export const DEFAULT_RPC_URL = "http://localhost:8899";
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_AGENTSAFE_PROGRAM_ID ?? idl.address,
);
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_RPC_URL;
export const DEMO_TOKEN_MINT = process.env.NEXT_PUBLIC_DEMO_TOKEN_MINT ?? "";

export const IDL_PROGRAM_ID = new PublicKey(idl.address);
export const PROGRAM_ID_MISMATCH = !PROGRAM_ID.equals(IDL_PROGRAM_ID);

export { idl };
