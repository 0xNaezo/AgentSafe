"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  CircleDot,
  Copy,
  DollarSign,
  ExternalLink,
  Globe,
} from "lucide-react";
import { StatusDot } from "@/app/components/status-dot";
import { generateIdenticonGradient } from "@/app/components/address-badge";
import { PROGRAM_ID } from "@/lib/solana/config";

/* ------------------------------------------------------------------ */
/*  Static / mock data                                                */
/* ------------------------------------------------------------------ */

const PROGRAM_ADDRESS = PROGRAM_ID.toBase58();

const VAULT_PDA = "7xQvRz8KdNbW3mPj9sLtYh2fXcVgQ4RkAe6Uz01nMo8p";
const VAULT_TOKEN_ACCOUNT =
  "Eq9TfBnW2sXcLhPj7KdRtYm4VzAg3RkQe8Uo1ZD6NbIx";

const VAULT_OWNER = "5LG3kWmQ7tNbXcPj9sRfYh2VzAgD4RkQe6Uo1ZpM21Nk";
const ASSIGNED_AGENT = "3Kp9mNt2QrXsWfBnD7yLh4cVz8RpKwMtZ6QaPxAgSf1V";

const TOKEN_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const EXPLORER_BASE = "https://explorer.solana.com/address";

function explorerUrl(address: string) {
  return `${EXPLORER_BASE}/${address}?cluster=devnet`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function VaultMetadataPage() {
  return (
    <section className="grid gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950">Vault Metadata</h1>
          <p className="mt-1 text-sm text-zinc-500">
            On-chain accounts and program references for this vault. Verify them
            before signing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700">
            <StatusDot color="orange" pulse size="sm" />
            Devnet
          </span>
          <a
            href={explorerUrl(VAULT_PDA)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700  transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View on Explorer
          </a>
        </div>
      </div>

      {/* ── Quick info cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoCard icon={Globe} label="Network" value="Solana Devnet" />
        <InfoCard
          icon={CircleDot}
          label="Vault Status"
          value="Active"
          valueClassName="text-emerald-600"
        />
        <InfoCard icon={DollarSign} label="Asset" value="USDC" />
        <InfoCard icon={Calendar} label="Created" value="2026-06-02" />
      </div>

      {/* ── Program & Accounts ─────────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 ">
        <SectionHeader title="Program & Accounts" />
        <div className="divide-y divide-zinc-100">
          <AddressRow
            label="Program ID"
            description="The AgentSafe Solana program (trust boundary)."
            address={PROGRAM_ADDRESS}
          />
          <AddressRow
            label="Vault PDA"
            description="Program-derived account that holds the policy state."
            address={VAULT_PDA}
          />
          <AddressRow
            label="Vault Token Account"
            description="Associated token account custodying vault USDC."
            address={VAULT_TOKEN_ACCOUNT}
          />
        </div>
      </div>

      {/* ── Authorities ────────────────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 ">
        <SectionHeader title="Authorities" />
        <div className="divide-y divide-zinc-100">
          <AddressRow
            label="Vault Owner"
            description="Controls configuration, approvals and withdrawals."
            address={VAULT_OWNER}
          />
          <AddressRow
            label="Assigned Agent"
            description="Only wallet permitted to initiate payment intents."
            address={ASSIGNED_AGENT}
          />
        </div>
      </div>

      {/* ── Asset ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 ">
        <SectionHeader title="Asset" />
        <div className="divide-y divide-zinc-100">
          <AddressRow
            label="Token Mint"
            description="USDC mint locked to this vault for the MVP."
            address={TOKEN_MINT}
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-zinc-200 px-5 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 ">
      <Icon size={16} className="text-zinc-400" aria-hidden="true" />
      <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold text-zinc-900 ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function AddressRow({
  label,
  description,
  address,
}: {
  label: string;
  description: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);
  const gradient = generateIdenticonGradient(address);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 shrink-0 sm:max-w-[280px]">
        <p className="text-sm font-bold text-zinc-900">{label}</p>
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="identicon shrink-0"
          style={{ background: gradient }}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate font-mono text-sm font-medium text-zinc-900">
          {address}
        </span>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          onClick={() => void copyAddress()}
          aria-label={copied ? "Copied" : "Copy address"}
          title={copied ? "Copied" : "Copy address"}
        >
          {copied ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
        </button>
        <a
          href={explorerUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="View on explorer"
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
