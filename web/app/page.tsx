"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  getAccount,
  getMint,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { formatTokenAmount } from "../lib/solana/amounts";
import {
  DEMO_TOKEN_MINT,
  PROGRAM_ID,
  PROGRAM_ID_MISMATCH,
  RPC_URL,
} from "../lib/solana/config";
import { deriveVaultPda, deriveVaultTokenAccountPda } from "../lib/solana/pda";
import { useAgentSafeProgram } from "../lib/solana/program";
import { fetchVault, type VaultAccount } from "../lib/solana/vault";

type DashboardState =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "missing"; message: string }
  | {
      kind: "ready";
      vault: VaultAccount;
      mintDecimals: number;
      vaultBalance: string;
    }
  | { kind: "error"; message: string };

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAgentSafeProgram();
  const [state, setState] = useState<DashboardState>({
    kind: "idle",
    message: "Connect an owner wallet to read its AgentSafe vault.",
  });

  const tokenMint = useMemo(() => parsePublicKeyOrNull(DEMO_TOKEN_MINT), []);

  const addresses = useMemo(() => {
    if (!publicKey || !tokenMint) {
      return null;
    }

    const [vaultState] = deriveVaultPda(publicKey, tokenMint);
    const [vaultTokenAccount] = deriveVaultTokenAccountPda(vaultState);

    return { vaultState, vaultTokenAccount };
  }, [publicKey, tokenMint]);

  const loadVault = useCallback(async () => {
    if (!publicKey) {
      setState({
        kind: "idle",
        message: "Connect an owner wallet to read its AgentSafe vault.",
      });
      return;
    }

    if (!tokenMint) {
      setState({
        kind: "error",
        message:
          "Set NEXT_PUBLIC_DEMO_TOKEN_MINT to a valid localnet token mint.",
      });
      return;
    }

    if (!program || !addresses) {
      setState({
        kind: "loading",
        message: "Waiting for wallet and Anchor provider...",
      });
      return;
    }

    if (PROGRAM_ID_MISMATCH) {
      setState({
        kind: "error",
        message: "Configured program id does not match the bundled Anchor IDL.",
      });
      return;
    }

    try {
      setState({
        kind: "loading",
        message: "Reading vault account from localnet...",
      });

      const vault = await fetchVault(program, addresses.vaultState);

      if (!vault) {
        setState({
          kind: "missing",
          message: "No vault exists yet for this owner and token mint.",
        });
        return;
      }

      const mint = await getMint(connection, tokenMint);

      try {
        const tokenAccount = await getAccount(
          connection,
          addresses.vaultTokenAccount,
        );

        setState({
          kind: "ready",
          vault,
          mintDecimals: mint.decimals,
          vaultBalance: formatTokenAmount(
            tokenAccount.amount.toString(),
            mint.decimals,
          ),
        });
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          setState({
            kind: "ready",
            vault,
            mintDecimals: mint.decimals,
            vaultBalance: "0",
          });
          return;
        }

        throw error;
      }
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to read vault state.",
      });
    }
  }, [addresses, connection, program, publicKey, tokenMint]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadVault();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadVault]);

  return (
    <>
      <section className="grid gap-4 py-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Vault balance
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-4xl font-semibold tracking-normal text-slate-950">
                  {state.kind === "ready" ? state.vaultBalance : "--"}
                </span>
                <span className="pb-1 text-lg font-semibold text-slate-500">
                  demo token
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <LockKeyhole size={16} aria-hidden="true" />
              Policy enforced on-chain
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric
              icon={Bot}
              label="Agent wallet"
              value={
                state.kind === "ready" ? shortKey(state.vault.agent) : "--"
              }
            />
            <DailySpendMetric state={state} />
            <Metric
              icon={Activity}
              label="Vault account"
              value={addresses ? shortKey(addresses.vaultState) : "--"}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                href="/vault-setup"
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                Create vault
              </Link>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
                onClick={() => void loadVault()}
              >
                <RefreshCcw size={17} aria-hidden="true" />
                Refresh
              </button>
            </div>
            <AddressBadge
              label="Token Vault:"
              value={addresses?.vaultTokenAccount.toBase58() ?? "not derived"}
            />
          </div>
        </div>

        <StatusCard state={state} />
      </section>

      <section className="grid flex-1 gap-4 pb-4 lg:grid-cols-[0.95fr_1.05fr]">
        <PolicyCard state={state} mint={tokenMint} owner={publicKey} />
        <ConnectionCard addresses={addresses} tokenMint={tokenMint} />
      </section>
    </>
  );
}

type IconComponent = typeof ShieldCheck;

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={17} aria-hidden="true" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 truncate text-base font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DailySpendMetric({ state }: { state: DashboardState }) {
  const current =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.spentToday, state.mintDecimals))
      : 0;
  const limit =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.dailyLimit, state.mintDecimals))
      : 0;
  const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const progressTone =
    percent >= 90
      ? "bg-rose-500"
      : percent >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";
  const textTone =
    percent >= 90
      ? "text-rose-700"
      : percent >= 70
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <CircleDollarSign size={17} aria-hidden="true" />
        <p className="text-sm font-medium">Spent today</p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="truncate text-base font-semibold text-slate-950">
          {state.kind === "ready"
            ? `${formatTokenAmount(state.vault.spentToday, state.mintDecimals)} / ${formatTokenAmount(state.vault.dailyLimit, state.mintDecimals)}`
            : "--"}
        </p>
        <p className={`text-xs font-bold ${textTone}`}>
          {Math.round(percent)}%
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${progressTone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatusCard({ state }: { state: DashboardState }) {
  const content = getStatusContent(state);
  const Icon = content.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Localnet status</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {content.title}
          </h2>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${content.tone}`}
        >
          <Icon size={19} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-700">{content.message}</p>
      </div>

      {state.kind === "missing" && (
        <Link
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          href="/vault-setup"
        >
          Create vault
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function PolicyCard({
  mint,
  owner,
  state,
}: {
  mint: PublicKey | null;
  owner: PublicKey | null;
  state: DashboardState;
}) {
  const rules = [
    {
      label: "Owner wallet",
      value: owner?.toBase58() ?? "Connect wallet",
      state: owner ? "Connected" : "Missing",
    },
    {
      label: "Token mint",
      value: mint?.toBase58() ?? "Set env",
      state: mint ? "Configured" : "Missing",
    },
    {
      label: "Daily spend limit",
      value:
        state.kind === "ready"
          ? formatTokenAmount(state.vault.dailyLimit, state.mintDecimals)
          : "--",
      state: state.kind === "ready" ? "Active" : "Pending",
    },
    {
      label: "One-time spend limit",
      value:
        state.kind === "ready"
          ? formatTokenAmount(state.vault.onetimeLimit, state.mintDecimals)
          : "--",
      state: state.kind === "ready" ? "Active" : "Pending",
    },
    {
      label: "Last daily reset",
      value:
        state.kind === "ready"
          ? new Date(
              state.vault.lastResetTime.toNumber() * 1000,
            ).toLocaleString()
          : "--",
      state: state.kind === "ready" ? "On-chain" : "Pending",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Policy</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Active constraints
          </h2>
        </div>
        <ShieldCheck className="text-slate-500" size={21} aria-hidden="true" />
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {rule.label}
              </p>
              <p className="mt-1 break-words font-mono text-sm text-slate-500">
                {rule.value}
              </p>
            </div>
            <span className="self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              {rule.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionCard({
  addresses,
  tokenMint,
}: {
  addresses: { vaultState: PublicKey; vaultTokenAccount: PublicKey } | null;
  tokenMint: PublicKey | null;
}) {
  const rows = [
    { label: "RPC", value: RPC_URL },
    { label: "Program", value: PROGRAM_ID.toBase58() },
    { label: "Token mint", value: tokenMint?.toBase58() ?? "missing env" },
    {
      label: "Vault PDA",
      value: addresses?.vaultState.toBase58() ?? "not derived",
    },
    {
      label: "Token vault PDA",
      value: addresses?.vaultTokenAccount.toBase58() ?? "not derived",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Connection</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Anchor client inputs
          </h2>
        </div>
        <Activity className="text-slate-500" size={21} aria-hidden="true" />
      </div>

      <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[0.36fr_1fr] gap-3 py-3 text-sm"
          >
            <span className="font-medium text-slate-500">{row.label}</span>
            <span className="min-w-0 break-all font-mono font-semibold text-slate-950">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressBadge({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:ml-auto sm:w-auto">
      <span className="shrink-0 font-medium text-slate-500">{label}</span>
      <span className="min-w-0 truncate font-mono font-semibold text-slate-950">
        {shortAddress(value, 5)}
      </span>
      <button
        className={`relative overflow-hidden h-8 min-w-20 shrink-0 rounded-md border text-xs font-bold transition ${
          copied
            ? "border-emerald-200 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        }`}
        type="button"
        aria-label={copied ? "Address copied" : "Copy address"}
        title={copied ? "Copied" : "Copy address"}
        onClick={() => void copyAddress()}
      >
        <div
          className={`flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            copied ? "-translate-y-1/2" : "translate-y-0"
          }`}
        >
          <span className="flex h-8 items-center justify-center gap-1 px-2">
            <Copy size={15} aria-hidden="true" />
            Copy
          </span>
          <span className="flex h-8 items-center justify-center gap-1 px-2">
            <Check size={15} aria-hidden="true" />
            Copied
          </span>
        </div>
      </button>
    </div>
  );
}

function getStatusContent(state: DashboardState) {
  if (state.kind === "ready") {
    return {
      icon: CheckCircle2,
      message: "Vault state was loaded from the Anchor program.",
      title: "Vault found",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    };
  }

  if (state.kind === "missing") {
    return {
      icon: Clock3,
      message: state.message,
      title: "No vault yet",
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    };
  }

  if (state.kind === "error") {
    return {
      icon: TriangleAlert,
      message: state.message,
      title: "Read failed",
      tone: "text-rose-700 bg-rose-50 border-rose-100",
    };
  }

  if (state.kind === "loading") {
    return {
      icon: RefreshCcw,
      message: state.message,
      title: "Loading",
      tone: "text-sky-700 bg-sky-50 border-sky-100",
    };
  }

  return {
    icon: Wallet,
    message: state.message,
    title: "Wallet required",
    tone: "text-slate-700 bg-slate-50 border-slate-200",
  };
}

function parsePublicKeyOrNull(value: string) {
  try {
    const trimmed = value.trim();
    return trimmed ? new PublicKey(trimmed) : null;
  } catch {
    return null;
  }
}

function shortKey(value: PublicKey) {
  const key = value.toBase58();
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function shortAddress(value: string, visibleChars: number) {
  if (value.length <= visibleChars * 2 || value.includes(" ")) {
    return value;
  }

  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}
