"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { DEMO_TOKEN_MINT, PROGRAM_ID_MISMATCH } from "@/lib/solana/config";
import { deriveVaultPda, deriveVaultTokenAccountPda } from "@/lib/solana/pda";
import { useAgentSafeProgram } from "@/lib/solana/program";
import { fetchVault, initializeVault, updateVault } from "@/lib/solana/vault";
import { formatTokenAmount, parseTokenAmount } from "@/lib/solana/amounts";
import { toast } from "react-hot-toast";
import { Check } from "lucide-react";
import { BN } from "@coral-xyz/anchor";

import { AgentTokenCards } from "./components/agent-token-cards";
import { DangerZoneCard } from "./components/danger-zone-card";
import { RecipientWhitelistCard } from "./components/recipient-whitelist-card";
import { SpendingLimitsCard } from "./components/spending-limits-card";
import { DEFAULT_AGENT_ADDRESS, INITIAL_WHITELIST } from "./data";
import type { VaultLoadState, WhitelistEntry } from "./types";

export default function VaultSettingsPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAgentSafeProgram();

  const [dailyLimit, setDailyLimit] = useState("0");
  const [hourlyLimit, setHourlyLimit] = useState("0");
  const [perPaymentCap, setPerPaymentCap] = useState("0");

  const [agentAddress, setAgentAddress] = useState<string>("-");
  const [vaultLoadState, setVaultLoadState] =
    useState<VaultLoadState>("idle");

  const [whitelist, setWhitelist] =
    useState<WhitelistEntry[]>(INITIAL_WHITELIST);
  const [newAddress, setNewAddress] = useState("");

  const tokenMint = useMemo(() => {
    try {
      const trimmed = DEMO_TOKEN_MINT.trim();
      return trimmed ? new PublicKey(trimmed) : null;
    } catch {
      return null;
    }
  }, []);

  const addresses = useMemo(() => {
    if (!publicKey || !tokenMint) return null;
    const [vaultState] = deriveVaultPda(publicKey, tokenMint);
    const [vaultTokenAccount] = deriveVaultTokenAccountPda(vaultState);
    return { vaultState, vaultTokenAccount };
  }, [publicKey, tokenMint]);

  const resetVaultForm = useCallback(() => {
    setAgentAddress("-");
    setDailyLimit("0");
    setHourlyLimit("0");
    setPerPaymentCap("0");
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!program || !addresses) {
        if (active) {
          setVaultLoadState("idle");
          resetVaultForm();
        }
        return;
      }

      try {
        setVaultLoadState("loading");
        const vault = await fetchVault(program, addresses.vaultState);
        if (!active) return;

        if (vault) {
          setAgentAddress(vault.agent.toBase58());
          const mint = await getMint(connection, tokenMint!);
          setDailyLimit(formatTokenAmount(vault.dailyLimit, mint.decimals));
          setHourlyLimit(formatTokenAmount(vault.hourlyLimit, mint.decimals));
          setPerPaymentCap(
            formatTokenAmount(vault.onetimeLimit, mint.decimals),
          );
          setVaultLoadState("exists");
        } else {
          resetVaultForm();
          setVaultLoadState("missing");
        }
      } catch (err) {
        console.error(err);
        if (active) {
          resetVaultForm();
          setVaultLoadState("error");
        }
      }
    }
    void load();

    return () => {
      active = false;
    };
  }, [program, addresses, connection, tokenMint, resetVaultForm]);

  const tokenMintStr = tokenMint?.toBase58() || "-";

  const addAddress = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setWhitelist((prev) => [...prev, { address: trimmed, label: "" }]);
    setNewAddress("");
  };

  const removeAddress = (index: number) => {
    setWhitelist((prev) => prev.filter((_, i) => i !== index));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(program) &&
    Boolean(addresses) &&
    Boolean(publicKey) &&
    Boolean(tokenMint) &&
    !PROGRAM_ID_MISMATCH &&
    !isSubmitting &&
    (vaultLoadState === "exists" || vaultLoadState === "missing");

  const submitAction = vaultLoadState === "exists" ? "update" : "create";
  const submitLabel =
    submitAction === "update" ? "Update On-Chain" : "Create Vault";
  const loadingLabel = submitAction === "update" ? "Updating..." : "Creating...";

  const handleSubmit = async () => {
    if (!program || !addresses || !publicKey || !tokenMint) return;
    try {
      if (PROGRAM_ID_MISMATCH) {
        throw new Error("Configured program id does not match the bundled IDL.");
      }

      if (vaultLoadState !== "exists" && vaultLoadState !== "missing") {
        throw new Error("Vault status is still loading. Try again in a moment.");
      }

      setIsSubmitting(true);
      const mint = await getMint(connection, tokenMint);

      const agent = new PublicKey(DEFAULT_AGENT_ADDRESS);

      const parsedDaily = parseTokenAmount(
        dailyLimit.replace(/,/g, ""),
        mint.decimals,
      );
      const parsedHourly = parseTokenAmount(
        hourlyLimit.replace(/,/g, ""),
        mint.decimals,
      );
      const parsedOnetime = parseTokenAmount(
        perPaymentCap.replace(/,/g, ""),
        mint.decimals,
      );

      if (
        !parsedDaily.gt(new BN(0)) ||
        !parsedHourly.gt(new BN(0)) ||
        !parsedOnetime.gt(new BN(0))
      ) {
        throw new Error("Limits cannot be zero.");
      }

      if (parsedDaily.lt(parsedHourly) || parsedHourly.lt(parsedOnetime)) {
        throw new Error("Limits must satisfy: daily >= hourly >= one-time.");
      }

      const signature =
        vaultLoadState === "exists"
          ? await updateVault(program, {
              dailyLimit: parsedDaily,
              hourlyLimit: parsedHourly,
              onetimeLimit: parsedOnetime,
              owner: publicKey,
              vaultState: addresses.vaultState,
            })
          : await initializeVault(program, {
              agent,
              dailyLimit: parsedDaily,
              hourlyLimit: parsedHourly,
              onetimeLimit: parsedOnetime,
              owner: publicKey,
              tokenMint,
              vaultState: addresses.vaultState,
              vaultTokenAccount: addresses.vaultTokenAccount,
            });

      setVaultLoadState("exists");
      setAgentAddress((current) =>
        current === "-" ? agent.toBase58() : current,
      );
      toast.success(
        `Vault ${submitAction === "update" ? "updated" : "created"}: ${signature}`,
      );
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950">Vault Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Configure the spending policy enforced on-chain by the AgentSafe
            program.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800  transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <Check size={16} aria-hidden="true" />
            {isSubmitting ? loadingLabel : submitLabel}
          </button>
        </div>
      </div>

      <SpendingLimitsCard
        dailyLimit={dailyLimit}
        hourlyLimit={hourlyLimit}
        onDailyLimitChange={setDailyLimit}
        onHourlyLimitChange={setHourlyLimit}
        onPerPaymentCapChange={setPerPaymentCap}
        perPaymentCap={perPaymentCap}
        vaultLoadState={vaultLoadState}
      />

      <RecipientWhitelistCard
        entries={whitelist}
        newAddress={newAddress}
        onAddAddress={addAddress}
        onNewAddressChange={setNewAddress}
        onRemoveAddress={removeAddress}
      />

      <AgentTokenCards agentAddress={agentAddress} tokenMint={tokenMintStr} />

      <DangerZoneCard />
    </div>
  );
}
