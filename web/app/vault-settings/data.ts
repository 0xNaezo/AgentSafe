import type { WhitelistEntry } from "./types";

export const DEFAULT_AGENT_ADDRESS =
  process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? "";

export const INITIAL_WHITELIST: WhitelistEntry[] = [
  { address: "8wQrLk5M9Fp2xJv3nHdT4kLm", label: "Anna - Design" },
  { address: "Bn2XaC7dW1Rv4eKp8Ys39pQz", label: "Cloud API" },
  { address: "Xx91Tb6mQ3Hj5wNf7Zr20wZZ", label: "Notion Inc" },
  { address: "Dd47Vc8kR2Ln6xYg9Bs1mP2k", label: "Hosting" },
];
