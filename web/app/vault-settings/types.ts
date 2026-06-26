export type WhitelistEntry = {
  address: string;
  label: string;
};

export type VaultLoadState = "idle" | "loading" | "exists" | "missing" | "error";
