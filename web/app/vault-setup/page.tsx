"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  Bot,
  Check,
  CircleDollarSign,
  Copy,
  Info,
  ListChecks,
  LockKeyhole,
  Pause,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useHasMounted } from "../hooks/use-has-mounted";
import { parseTokenAmount } from "../../lib/solana/amounts";
import {
  DEMO_TOKEN_MINT,
  PROGRAM_ID_MISMATCH,
  RPC_URL,
} from "../../lib/solana/config";
import {
  deriveVaultPda,
  deriveVaultTokenAccountPda,
} from "../../lib/solana/pda";
import { useAgentSafeProgram } from "../../lib/solana/program";
import { initializeVault } from "../../lib/solana/vault";

const setupChecks = [
  "Owner controls configuration and approvals",
  "Agent wallet may only initiate payment requests",
  "One vault controls one token mint in the MVP",
  "Critical policy checks are enforced on-chain",
];

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | {
      kind: "success";
      message: string;
      signature: string;
      vaultState: string;
      vaultTokenAccount: string;
    }
  | { kind: "error"; message: string };

export default function VaultSetupPage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAgentSafeProgram();
  const hasMounted = useHasMounted();
  const ownerPublicKey = hasMounted ? publicKey : null;
  const anchorProgram = hasMounted ? program : null;

  const [agentAddress, setAgentAddress] = useState("");
  const [tokenMintAddress, setTokenMintAddress] = useState(DEMO_TOKEN_MINT);
  const [dailyLimit, setDailyLimit] = useState("900");
  const [hourlyLimit, setHourlyLimit] = useState("300");
  const [onetimeLimit, setOnetimeLimit] = useState("150");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const tokenMint = useMemo(
    () => parsePublicKeyOrNull(tokenMintAddress),
    [tokenMintAddress],
  );

  const agent = useMemo(
    () => parsePublicKeyOrNull(agentAddress),
    [agentAddress],
  );

  const vaultAddresses = useMemo(() => {
    if (!ownerPublicKey || !tokenMint) {
      return null;
    }

    const [vaultState] = deriveVaultPda(ownerPublicKey, tokenMint);
    const [vaultTokenAccount] = deriveVaultTokenAccountPda(vaultState);

    return { vaultState, vaultTokenAccount };
  }, [ownerPublicKey, tokenMint]);

  const canSubmit =
    hasMounted &&
    Boolean(ownerPublicKey) &&
    Boolean(anchorProgram) &&
    Boolean(agent) &&
    Boolean(tokenMint) &&
    Boolean(vaultAddresses) &&
    submitState.kind !== "loading" &&
    !PROGRAM_ID_MISMATCH;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (!ownerPublicKey) {
        throw new Error("Connect the owner wallet before creating a vault.");
      }

      if (!anchorProgram) {
        throw new Error("Wallet is not ready to sign Anchor transactions yet.");
      }

      if (PROGRAM_ID_MISMATCH) {
        throw new Error(
          "Configured program id does not match the bundled IDL.",
        );
      }

      if (!agent) {
        throw new Error("Agent wallet must be a valid Solana public key.");
      }

      if (!tokenMint) {
        throw new Error("Token mint must be a valid Solana public key.");
      }

      if (!vaultAddresses) {
        throw new Error("Vault PDA could not be derived.");
      }

      setSubmitState({
        kind: "loading",
        message: "Reading token mint and preparing transaction...",
      });

      const mint = await getMint(connection, tokenMint);
      const dailyLimitUnits = parseTokenAmount(dailyLimit, mint.decimals);
      const hourlyLimitUnits = parseTokenAmount(hourlyLimit, mint.decimals);
      const onetimeLimitUnits = parseTokenAmount(onetimeLimit, mint.decimals);

      if (dailyLimitUnits.toString() === "0") {
        throw new Error("Daily limit must be greater than zero.");
      }

      if (hourlyLimitUnits.toString() === "0") {
        throw new Error("Hourly limit must be greater than zero.");
      }

      if (onetimeLimitUnits.toString() === "0") {
        throw new Error("One-time limit must be greater than zero.");
      }

      if (
        dailyLimitUnits.lt(hourlyLimitUnits) ||
        hourlyLimitUnits.lt(onetimeLimitUnits)
      ) {
        throw new Error(
          "Limits must satisfy: daily >= hourly >= one-time.",
        );
      }

      setSubmitState({
        kind: "loading",
        message: "Waiting for wallet signature...",
      });

      const signature = await initializeVault(anchorProgram, {
        agent,
        dailyLimit: dailyLimitUnits,
        hourlyLimit: hourlyLimitUnits,
        owner: ownerPublicKey,
        onetimeLimit: onetimeLimitUnits,
        tokenMint,
        vaultState: vaultAddresses.vaultState,
        vaultTokenAccount: vaultAddresses.vaultTokenAccount,
      });

      setSubmitState({
        kind: "success",
        message: "Vault created on localnet.",
        signature,
        vaultState: vaultAddresses.vaultState.toBase58(),
        vaultTokenAccount: vaultAddresses.vaultTokenAccount.toBase58(),
      });
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <>
      <section className="grid gap-4 py-5 lg:grid-cols-[1fr_0.42fr]">
        <form
          className="grid gap-4"
          aria-label="Vault policy configuration"
          onSubmit={handleSubmit}
        >
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Create vault
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                  Owner and agent
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <ShieldCheck size={16} aria-hidden="true" />
                Localnet draft
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Vault owner wallet"
                htmlFor="owner-wallet"
                icon={Wallet}
              >
                <input
                  id="owner-wallet"
                  className="field-control font-mono"
                  value={
                    ownerPublicKey?.toBase58() ??
                    "Connect wallet to fill owner address"
                  }
                  readOnly
                />
              </Field>
              <Field
                label="Vault Address (PDA)"
                htmlFor="vault-address"
                icon={LockKeyhole}
              >
                <ReadonlyAddress
                  id="vault-address"
                  value={
                    vaultAddresses?.vaultState.toBase58() ??
                    "Connect wallet and enter mint"
                  }
                />
              </Field>
              <Field
                label="Assigned agent wallet"
                htmlFor="agent-wallet"
                icon={Bot}
              >
                <input
                  id="agent-wallet"
                  name="agent-wallet"
                  className="field-control font-mono"
                  value={agentAddress}
                  onChange={(event) => setAgentAddress(event.target.value)}
                  placeholder="Agent wallet public key"
                />
              </Field>
              <Field
                label="Vault token mint"
                htmlFor="token-mint"
                icon={LockKeyhole}
              >
                <input
                  id="token-mint"
                  name="token-mint"
                  className="field-control font-mono"
                  value={tokenMintAddress}
                  onChange={(event) => setTokenMintAddress(event.target.value)}
                  placeholder="Local demo token mint public key"
                />
              </Field>
              <Field
                label="Token Vault Account (PDA)"
                htmlFor="token-vault-address"
                icon={LockKeyhole}
              >
                <ReadonlyAddress
                  id="token-vault-address"
                  value={
                    vaultAddresses?.vaultTokenAccount.toBase58() ??
                    "Derived after mint is valid"
                  }
                />
              </Field>
              <Field label="RPC endpoint" htmlFor="rpc-endpoint" icon={Info}>
                <input
                  id="rpc-endpoint"
                  className="field-control font-mono"
                  value={RPC_URL}
                  readOnly
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Policy model
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                  Spending limits
                </h2>
              </div>
              <ListChecks
                className="text-zinc-500"
                size={21}
                aria-hidden="true"
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <LimitField
                label="Daily spending limit"
                value={dailyLimit}
                onChange={setDailyLimit}
              />
              <LimitField
                label="Hourly spending limit"
                value={hourlyLimit}
                onChange={setHourlyLimit}
              />
              <LimitField
                label="One-time spending limit"
                value={onetimeLimit}
                onChange={setOnetimeLimit}
              />
            </div>

            <div className="mt-5 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Pause switch
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  The current on-chain MVP stores spending limits only; pause
                  can be added once policy state grows.
                </p>
              </div>
              <label className="inline-flex w-fit items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 ">
                <input
                  className="h-4 w-4 accent-zinc-950"
                  type="checkbox"
                  name="pause-vault"
                  disabled
                />
                <Pause size={16} aria-hidden="true" />
                Paused
              </label>
            </div>
          </div>

          {submitState.kind !== "idle" && <StatusPanel state={submitState} />}

          <div className="flex flex-wrap justify-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 ">
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800  transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
              disabled={submitState.kind === "loading"}
              type="button"
              onClick={() => {
                if (submitState.kind === "loading") {
                  return;
                }

                setSubmitState({ kind: "idle" });
              }}
            >
              Clear status
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white  transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              type="submit"
              disabled={!canSubmit}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              {submitState.kind === "loading" ? "Creating..." : "Create vault"}
            </button>
          </div>
        </form>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
                <Info size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  MVP constraint
                </p>
                <h2 className="text-lg font-semibold text-zinc-950">
                  One mint, one policy
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              This form calls the Anchor `initialize` instruction. It creates
              the vault state account and the program-owned token vault account.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
            <p className="text-sm font-medium text-zinc-500">
              Policy checklist
            </p>
            <div className="mt-4 divide-y divide-zinc-100">
              {setupChecks.map((check) => (
                <div
                  key={check}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-emerald-700"
                    size={17}
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-6 text-zinc-700">{check}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

type FieldProps = {
  children: ReactNode;
  htmlFor: string;
  icon: typeof ShieldCheck;
  label: string;
};

function Field({ children, htmlFor, icon: Icon, label }: FieldProps) {
  return (
    <div>
      <label
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700"
        htmlFor={htmlFor}
      >
        <Icon size={16} aria-hidden="true" />
        {label}
      </label>
      {children}
    </div>
  );
}

function LimitField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputId = label.toLowerCase().replaceAll(" ", "-");

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
      </span>
      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 focus-within:border-zinc-400">
        <input
          id={inputId}
          className="min-h-11 min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-zinc-950 outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
        />
        <span className="flex items-center border-l border-zinc-200 px-3 text-sm font-semibold text-zinc-500">
          token units
        </span>
      </div>
    </label>
  );
}

function ReadonlyAddress({ id, value }: { id: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
      <input
        id={id}
        className="min-h-11 min-w-0 border-0 bg-transparent px-3 font-mono text-sm font-semibold text-zinc-950 outline-none"
        value={value}
        readOnly
      />
      <button
        className={`relative overflow-hidden h-11 min-w-24 border-l text-xs font-bold transition ${
          copied
            ? "border-emerald-200 bg-emerald-100 text-emerald-800 ring-2 ring-inset ring-emerald-200"
            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-50"
        }`}
        type="button"
        aria-label={copied ? "Address copied" : "Copy address"}
        title={copied ? "Copied" : "Copy address"}
        onClick={() => void copyAddress()}
      >
        <div
          className={`flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            copied ? "-tranzinc-y-1/2" : "tranzinc-y-0"
          }`}
        >
          <span className="flex h-11 items-center justify-center gap-1 px-3">
            <Copy size={16} aria-hidden="true" />
            Copy
          </span>
          <span className="flex h-11 items-center justify-center gap-1 px-3">
            <Check size={16} aria-hidden="true" />
            Copied
          </span>
        </div>
      </button>
    </div>
  );
}

function StatusPanel({
  state,
}: {
  state: Exclude<SubmitState, { kind: "idle" }>;
}) {
  const tone =
    state.kind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : state.kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`rounded-lg border p-4 text-sm font-medium ${tone}`}>
      <p>{state.message}</p>
      {state.kind === "success" && (
        <div className="mt-3 grid gap-2 font-mono text-xs">
          <p className="break-all">tx: {state.signature}</p>
          <p className="break-all">vault: {state.vaultState}</p>
          <p className="break-all">token vault: {state.vaultTokenAccount}</p>
        </div>
      )}
    </div>
  );
}

function parsePublicKeyOrNull(value: string) {
  try {
    const trimmed = value.trim();
    return trimmed ? new PublicKey(trimmed) : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message).trim();

    if (message) {
      return message;
    }
  }

  return "Vault creation failed. Check the wallet, localnet RPC, token mint, and whether this vault already exists.";
}
