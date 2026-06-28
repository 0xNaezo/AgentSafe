"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import {
  AUDIT_LOG_LIMIT,
  readAuditLog,
  type AuditLogEntry,
} from "@/lib/audit-log";
import { DEMO_TOKEN_MINT } from "@/lib/solana/config";
import { AuditLogTable } from "@/app/components/audit-log-table";
import { StatusDot } from "@/app/components/status-dot";
import { WalletConnect } from "@/app/components/wallet-connect";

export default function AuditPage() {
  const { publicKey } = useWallet();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const tokenMint = useMemo(() => parsePublicKeyOrNull(DEMO_TOKEN_MINT), []);

  useEffect(() => {
    let cancelled = false;

    if (!publicKey || !tokenMint) {
      window.queueMicrotask(() => {
        if (!cancelled) {
          setAuditLog([]);
        }
      });
      return;
    }

    const owner = publicKey.toBase58();
    const tokenMintAddress = tokenMint.toBase58();

    window.queueMicrotask(() => {
      if (!cancelled) {
        setAuditLog(readAuditLog(owner, tokenMintAddress));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [publicKey, tokenMint]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-950">Audit Log</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span>{auditLog.length} events</span>
            <span className="text-zinc-300">/</span>
            <span>Last {AUDIT_LOG_LIMIT}</span>
          </div>
        </div>
        <WalletConnect />
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-zinc-950">All Events</h2>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <StatusDot color="green" pulse />
              Live
            </span>
          </div>
        </div>
        <AuditLogTable
          entries={auditLog}
          emptyTitle={publicKey ? "No audit events yet" : "Wallet not connected"}
          emptyDescription={
            publicKey
              ? "Agent payments and dashboard transfers will appear here."
              : "Connect the vault owner wallet to view its audit log."
          }
        />
      </div>
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
