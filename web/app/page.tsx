"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Gift,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatTokenAmount, parseTokenAmount } from "@/lib/solana/amounts";
import { DEMO_TOKEN_MINT, PROGRAM_ID_MISMATCH } from "@/lib/solana/config";
import { deriveVaultPda, deriveVaultTokenAccountPda } from "@/lib/solana/pda";
import { useAgentSafeProgram } from "@/lib/solana/program";
import { getEffectiveSpent } from "@/lib/solana/spending-window";
import {
  fetchVault,
  ownerForceTransfer,
  type VaultAccount,
} from "@/lib/solana/vault";
import { AddressBadge } from "@/app/components/address-badge";
import { ProgressMetric } from "@/app/components/progress-metric";
import { StatusDot } from "@/app/components/status-dot";
import { UsdcIcon } from "@/app/components/icons/usdc-icon";
import { WalletConnect } from "@/app/components/wallet-connect";

type DashboardState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "missing" }
  | {
      kind: "ready";
      vault: VaultAccount;
      mintDecimals: number;
      vaultBalance: string;
    }
  | { kind: "error"; message: string };

type AuditEntry = {
  id: number;
  icon: "check" | "warning" | "blocked";
  event: string;
  recipient: string;
  amount: string;
  positive: boolean;
  time: string;
  status: "Passed" | "Pending" | "Blocked";
};

type TokenAction = "deposit" | "withdraw";

type ActionStatus =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "success"; signature: string }
  | { kind: "error"; message: string };

const AUDIT_LOG: AuditEntry[] = [
  {
    id: 1,
    icon: "check",
    event: "Auto-payment executed",
    recipient: "8wQr...4kLm",
    amount: "-50.00 USDC",
    positive: false,
    time: "2m ago",
    status: "Passed",
  },
  {
    id: 2,
    icon: "warning",
    event: "Manual approval required",
    recipient: "Bn2X...9pQz",
    amount: "-1,200.00 USDC",
    positive: false,
    time: "8m ago",
    status: "Pending",
  },
  {
    id: 3,
    icon: "blocked",
    event: "Recipient not whitelisted",
    recipient: "Xx91...0wZZ",
    amount: "-4,800.00 USDC",
    positive: false,
    time: "15m ago",
    status: "Blocked",
  },
  {
    id: 4,
    icon: "check",
    event: "Deposit received",
    recipient: "Vault...Self",
    amount: "+5,000.00 USDC",
    positive: true,
    time: "3h ago",
    status: "Passed",
  },
  {
    id: 5,
    icon: "blocked",
    event: "Per-payment limit exceeded",
    recipient: "Dd47...mP2k",
    amount: "-900.00 USDC",
    positive: false,
    time: "5h ago",
    status: "Blocked",
  },
  {
    id: 6,
    icon: "check",
    event: "Auto-payment executed",
    recipient: "8wQr...4kLm",
    amount: "-25.00 USDC",
    positive: false,
    time: "6h ago",
    status: "Passed",
  },
];

function AuditIcon({ type }: { type: AuditEntry["icon"] }) {
  switch (type) {
    case "check":
      return (
        <CheckCircle2
          size={16}
          className="text-emerald-500"
          aria-hidden="true"
        />
      );
    case "warning":
      return (
        <AlertTriangle
          size={16}
          className="text-amber-500"
          aria-hidden="true"
        />
      );
    case "blocked":
      return <XCircle size={16} className="text-rose-500" aria-hidden="true" />;
  }
}

function statusDotColor(
  status: AuditEntry["status"],
): "green" | "orange" | "red" {
  switch (status) {
    case "Passed":
      return "green";
    case "Pending":
      return "orange";
    case "Blocked":
      return "red";
  }
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const program = useAgentSafeProgram();
  const [state, setState] = useState<DashboardState>({ kind: "idle" });
  const [activeAction, setActiveAction] = useState<TokenAction | null>(null);
  const [amount, setAmount] = useState("");
  const [actionStatus, setActionStatus] = useState<ActionStatus>({
    kind: "idle",
  });
  const [isRequestingTestTokens, setIsRequestingTestTokens] = useState(false);

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
      setState({ kind: "idle" });
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
      setState({ kind: "idle" });
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
      setState({ kind: "loading" });

      const vault = await fetchVault(program, addresses.vaultState);

      if (!vault) {
        setState({ kind: "missing" });
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

  const canUseVaultActions =
    state.kind === "ready" &&
    Boolean(publicKey) &&
    Boolean(program) &&
    Boolean(addresses) &&
    Boolean(addresses?.vaultTokenAccount) &&
    Boolean(tokenMint) &&
    !PROGRAM_ID_MISMATCH;

  const isActionLoading = actionStatus.kind === "loading";

  function openAction(action: TokenAction) {
    setActiveAction(action);
    setAmount("");
    setActionStatus({ kind: "idle" });
  }

  function closeAction() {
    if (isActionLoading) {
      return;
    }

    setActiveAction(null);
    setAmount("");
    setActionStatus({ kind: "idle" });
  }

  async function handleActionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (!activeAction) {
        return;
      }

      if (!publicKey || !program || !addresses || !tokenMint) {
        throw new Error("Connect the owner wallet and load the vault first.");
      }

      if (state.kind !== "ready") {
        throw new Error("Vault is not ready yet.");
      }

      const parsedAmount = parseTokenAmount(amount, state.mintDecimals);

      if (parsedAmount.toString() === "0") {
        throw new Error("Amount must be greater than zero.");
      }

      const rawAmount = BigInt(parsedAmount.toString());

      setActionStatus({
        kind: "loading",
        message:
          activeAction === "deposit"
            ? "Waiting for wallet signature..."
            : "Preparing owner withdrawal...",
      });

      const ownerTokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );

      let signature: string;

      if (activeAction === "deposit") {
        const transaction = new Transaction().add(
          createTransferCheckedInstruction(
            ownerTokenAccount,
            tokenMint,
            addresses.vaultTokenAccount,
            publicKey,
            rawAmount,
            state.mintDecimals,
            [],
            TOKEN_PROGRAM_ID,
          ),
        );

        signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");
      } else {
        signature = await ownerForceTransfer(program, {
          amount: parsedAmount,
          owner: publicKey,
          preInstructions: [
            createAssociatedTokenAccountIdempotentInstruction(
              publicKey,
              ownerTokenAccount,
              publicKey,
              tokenMint,
              TOKEN_PROGRAM_ID,
            ),
          ],
          toTokenAccount: ownerTokenAccount,
          tokenMint,
          vaultState: addresses.vaultState,
          vaultTokenAccount: addresses.vaultTokenAccount,
        });
      }

      setActionStatus({ kind: "success", signature });
      toast.success(
        `${activeAction === "deposit" ? "Deposit" : "Withdraw"} confirmed`,
      );
      await loadVault();
    } catch (error) {
      const message = getErrorMessage(error);
      setActionStatus({ kind: "error", message });
      toast.error(message);
    }
  }

  async function requestTestTokens() {
    try {
      if (!publicKey) {
        throw new Error("Connect a wallet first.");
      }

      setIsRequestingTestTokens(true);

      const response = await fetch("/api/test-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: publicKey.toBase58() }),
      });

      const body = (await response.json()) as {
        amount?: string;
        error?: string;
        signature?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to send test tokens.");
      }

      toast.success(`Sent ${body.amount ?? "1000"} test USDC`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRequestingTestTokens(false);
    }
  }

  /* Derive display values from vault state or fall back to mock data */
  const balance = state.kind === "ready" ? state.vaultBalance : "0.00";

  const rawDailyCurrent =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.spentToday, state.mintDecimals))
      : 0;

  const dailyMax =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.dailyLimit, state.mintDecimals))
      : 0;

  const rawHourlyCurrent =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.spentHour, state.mintDecimals))
      : 0;

  const hourlyMax =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.hourlyLimit, state.mintDecimals))
      : 0;

  const onetimeMax =
    state.kind === "ready"
      ? Number(formatTokenAmount(state.vault.onetimeLimit, state.mintDecimals))
      : 0;

  /* Apply client-side window reset to mirror on-chain lazy logic */
  const { effectiveDaily: dailyCurrent, effectiveHourly: hourlyCurrent } =
    state.kind === "ready"
      ? getEffectiveSpent(
          rawDailyCurrent,
          rawHourlyCurrent,
          state.vault.lastResetTime.toNumber(),
        )
      : { effectiveDaily: 0, effectiveHourly: 0 };

  const dailyPercent =
    dailyMax > 0 ? Math.round((dailyCurrent / dailyMax) * 100) : 0;
  const hourlyPercent =
    hourlyMax > 0 ? Math.round((hourlyCurrent / hourlyMax) * 100) : 0;

  return (
    <>
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950">Vault Overview</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span>USDC Spending Vault</span>
            <span className="text-zinc-300">/</span>
            <span className="flex items-center gap-1.5">
              <StatusDot color="green" />
              Active
            </span>
          </div>
        </div>
        <WalletConnect />
      </div>

      {/* ── Available Balance Card ── */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Available Balance</p>
            <div className="mt-2 flex items-center">
              <span className="text-4xl font-bold tracking-tight text-zinc-950">
                {balance}
              </span>
              <div className="ml-3 mt-1 flex items-center gap-1.5">
                <UsdcIcon className="h-6 w-6" />
                <span className="text-lg font-semibold text-zinc-500">
                  USDC
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-zinc-400">≈ ${balance} USD</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestTestTokens}
              disabled={!publicKey || isRequestingTestTokens}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Gift size={15} aria-hidden="true" />
              {isRequestingTestTokens ? "Sending..." : "Get test tokens"}
            </button>
            <button
              type="button"
              onClick={() => openAction("deposit")}
              disabled={!canUseVaultActions}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowDown size={15} aria-hidden="true" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => openAction("withdraw")}
              disabled={!canUseVaultActions}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700  transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp size={15} aria-hidden="true" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ProgressMetric
          title="Daily Spending"
          current={dailyCurrent}
          max={dailyMax}
          barColor="blue"
          subtitle={`${dailyPercent}% of daily limit used`}
        />
        <ProgressMetric
          title="Hourly Spending"
          current={hourlyCurrent}
          max={hourlyMax}
          barColor="orange"
          subtitle={`${hourlyPercent}% of hourly limit used`}
        />
        <ProgressMetric
          title="Per-Payment Cap"
          current={onetimeMax}
          max={onetimeMax}
          unit="USDC"
          badge="Max"
          subtitle="Largest transaction today: 0.00 USDC"
        />
      </div>

      {/* ── Audit Log ── */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-zinc-950">Audit Log</h2>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <StatusDot color="green" pulse />
              Live
            </span>
          </div>
          <Link
            href="/audit"
            className="flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-700"
          >
            View all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="audit-log-table w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3 text-right">Time &amp; Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {AUDIT_LOG.map((entry) => (
                <tr key={entry.id} className="transition hover:bg-zinc-50/60">
                  <td className="whitespace-nowrap px-6 py-3">
                    <div className="flex items-center gap-2">
                      <AuditIcon type={entry.icon} />
                      <span className="font-medium text-zinc-700">
                        {entry.event}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <AddressBadge address={entry.recipient} showCopy={false} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span
                      className={`font-medium ${
                        entry.positive ? "text-emerald-600" : "text-zinc-700"
                      }`}
                    >
                      {entry.amount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-zinc-400">{entry.time}</span>
                      <StatusDot color={statusDotColor(entry.status)} />
                      <span
                        className={`text-xs font-semibold ${
                          entry.status === "Passed"
                            ? "text-emerald-600"
                            : entry.status === "Pending"
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="token-action-title"
        >
          <form
            onSubmit={handleActionSubmit}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="token-action-title"
                  className="text-lg font-semibold text-zinc-950"
                >
                  {activeAction === "deposit" ? "Deposit tokens" : "Withdraw tokens"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {activeAction === "deposit"
                    ? "Send tokens from your wallet to the vault."
                    : "Send vault tokens back to your connected wallet."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAction}
                disabled={isActionLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <label
              htmlFor="token-action-amount"
              className="mt-5 block text-sm font-medium text-zinc-700"
            >
              Amount
            </label>
            <div className="mt-2 flex rounded-lg border border-zinc-200 bg-zinc-50 focus-within:border-zinc-400">
              <input
                id="token-action-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isActionLoading}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-zinc-950 outline-none placeholder:text-zinc-400"
              />
              <span className="flex items-center border-l border-zinc-200 px-3 text-sm font-semibold text-zinc-500">
                USDC
              </span>
            </div>

            {actionStatus.kind === "loading" ? (
              <p className="mt-3 text-sm text-zinc-500">
                {actionStatus.message}
              </p>
            ) : null}
            {actionStatus.kind === "error" ? (
              <p className="mt-3 text-sm font-medium text-rose-600">
                {actionStatus.message}
              </p>
            ) : null}
            {actionStatus.kind === "success" ? (
              <p className="mt-3 break-all text-sm font-medium text-emerald-600">
                Confirmed: {actionStatus.signature}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAction}
                disabled={isActionLoading}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isActionLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {isActionLoading
                  ? "Processing..."
                  : activeAction === "deposit"
                    ? "Deposit"
                    : "Withdraw"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
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
  return error instanceof Error ? error.message : "Unexpected error.";
}
