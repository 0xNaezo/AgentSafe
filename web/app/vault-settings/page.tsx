"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Lock,
  Plus,
  SlidersHorizontal,
  StopCircle,
  Trash2,
} from "lucide-react";
import {
  AddressBadge,
  generateIdenticonGradient,
} from "@/app/components/address-badge";
import { StatusDot } from "@/app/components/status-dot";

/* ─── Mock data ─── */

type WhitelistEntry = {
  address: string;
  label: string;
};

const INITIAL_WHITELIST: WhitelistEntry[] = [
  { address: "8wQrLk5M9Fp2xJv3nHdT4kLm", label: "Anna — Design" },
  { address: "Bn2XaC7dW1Rv4eKp8Ys39pQz", label: "Cloud API" },
  { address: "Xx91Tb6mQ3Hj5wNf7Zr20wZZ", label: "Notion Inc" },
  { address: "Dd47Vc8kR2Ln6xYg9Bs1mP2k", label: "Hosting" },
];

/* ─── Page ─── */

export default function VaultSettingsPage() {
  const [dailyLimit, setDailyLimit] = useState("5,000.00");
  const [hourlyLimit, setHourlyLimit] = useState("1,000.00");
  const [perPaymentCap, setPerPaymentCap] = useState("500.00");
  const [approvalThreshold, setApprovalThreshold] = useState("500.00");

  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>(INITIAL_WHITELIST);
  const [newAddress, setNewAddress] = useState("");

  const addAddress = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setWhitelist((prev) => [...prev, { address: trimmed, label: "" }]);
    setNewAddress("");
  };

  const removeAddress = (index: number) => {
    setWhitelist((prev) => prev.filter((_, i) => i !== index));
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white  transition hover:bg-zinc-800"
          >
            <Check size={16} aria-hidden="true" />
            Update On-Chain
          </button>
        </div>
      </div>

      {/* ── Spending Limits ── */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
        <h2 className="text-base font-semibold text-zinc-950">
          Spending Limits
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          All limits are denominated in USDC and enforced by the on-chain
          program — the UI only previews them.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <LimitField
            label="Daily limit"
            value={dailyLimit}
            onChange={setDailyLimit}
            subtext="≈ $5,000.00"
            description="Resets every 24h"
          />
          <LimitField
            label="Hourly limit"
            value={hourlyLimit}
            onChange={setHourlyLimit}
            subtext="≈ $1,000.00"
            description="Rolling 60 min window"
          />
          <LimitField
            label="Per-payment cap"
            value={perPaymentCap}
            onChange={setPerPaymentCap}
            subtext=""
            description="Largest single auto-payment"
          />
          <LimitField
            label="Manual approval threshold"
            value={approvalThreshold}
            onChange={setApprovalThreshold}
            subtext="≈ $500.00"
            description="Above this, owner must approve"
          />
        </div>
      </div>

      {/* ── Recipient Whitelist ── */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Recipient Whitelist
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Only these addresses can receive funds. Everything else is rejected
              on-chain.
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600">
            {whitelist.length} addresses
          </span>
        </div>

        <div className="mt-5 divide-y divide-zinc-100">
          {whitelist.map((entry, index) => (
            <div
              key={`${entry.address}-${index}`}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AddressBadge
                  address={entry.address}
                  showCopy
                  className="min-w-0"
                />
                {entry.label && (
                  <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {entry.label}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => removeAddress(index)}
                aria-label="Remove address"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            className="field-control flex-1"
            placeholder="Paste a Solana address..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addAddress();
            }}
          />
          <button
            type="button"
            className="inline-flex h-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800  transition hover:border-zinc-300 hover:bg-zinc-50"
            onClick={addAddress}
          >
            <Plus size={15} aria-hidden="true" />
            Add
          </button>
        </div>
      </div>

      {/* ── Agent + Token Mint ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Assigned Agent */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
          <h2 className="text-base font-semibold text-zinc-950">
            Assigned Agent
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            The only wallet allowed to initiate payments.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span
              className="identicon identicon-lg rounded-lg"
              style={{
                background: generateIdenticonGradient(
                  "3Kp9xYbT5Qm8jRv2Wn7fCdHs4LzA6EgPkU1NtBoMmNt2",
                ),
              }}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="truncate font-mono text-sm font-semibold text-zinc-950">
                3Kp9 ··· mNt2
              </span>
              <div className="flex items-center gap-1.5">
                <StatusDot color="green" pulse />
                <span className="text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>
            </div>
            <button
              type="button"
              className="ml-auto inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800  transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Change
            </button>
          </div>
        </div>

        {/* Token Mint */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">
                Token Mint
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                One vault controls exactly one mint.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600">
              <Lock size={11} aria-hidden="true" />
              Locked
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span
              className="identicon identicon-lg"
              style={{
                background:
                  "linear-gradient(135deg, hsl(210, 80%, 55%), hsl(230, 75%, 50%))",
              }}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold text-zinc-950">
                USD Coin
              </span>
              <span className="truncate font-mono text-xs text-zinc-500">
                EPjF ··· kdd5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-xl bg-rose-50/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <StopCircle size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-600">
                Danger Zone
              </h2>
              <p className="mt-1 text-sm font-bold text-zinc-900">
                Pause Vault
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Immediately blocks all AI-initiated operations until you manually resume. Deposits and owner withdrawals remain available.
              </p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
                <SlidersHorizontal size={13} aria-hidden="true" />
                You&rsquo;ll be asked to confirm: &ldquo;Are you absolutely sure? This blocks all AI operations.&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-bold text-white  transition hover:bg-zinc-800"
          >
            <StopCircle size={15} aria-hidden="true" />
            PAUSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Spending Limit Field ─── */

function LimitField({
  label,
  value,
  onChange,
  subtext,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  subtext: string;
  description: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          className="field-control pr-24"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -tranzinc-y-1/2 items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
          <span className="text-xs font-semibold text-zinc-500">USDC</span>
        </span>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {subtext && <span className="font-mono">{subtext}</span>}
        {subtext && description && <span> · </span>}
        {description}
      </p>
    </div>
  );
}
