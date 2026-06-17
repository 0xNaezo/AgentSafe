import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let agentKeypair: Keypair | null = null;

function loadAgentKeypair(): Keypair {
  const privateKeyBase58 = process.env.AGENT_SECRET_KEY;

  if (!privateKeyBase58) {
    throw new Error(
      "AGENT_SECRET_KEY is not set in .env.local. " +
        "Export your wallet: solana-keygen export -o key.txt",
    );
  }

  const secretKey = bs58.decode(privateKeyBase58);

  return Keypair.fromSecretKey(secretKey);
}

export function getAgentKeypair(): Keypair {
  agentKeypair ??= loadAgentKeypair();
  return agentKeypair;
}

export function getAgentPubkey() {
  return getAgentKeypair().publicKey;
}
