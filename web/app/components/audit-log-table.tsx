"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { AuditLogEntry } from "@/lib/audit-log";
import { AddressBadge } from "@/app/components/address-badge";
import { StatusDot } from "@/app/components/status-dot";

type AuditLogTableProps = {
  entries: AuditLogEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function AuditLogTable({
  entries,
  emptyTitle = "No audit events yet",
  emptyDescription = "Agent payments and dashboard transfers will appear here.",
}: AuditLogTableProps) {
  return (
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
          {entries.map((entry) => (
            <tr key={entry.id} className="transition hover:bg-zinc-50/60">
              <td className="whitespace-nowrap px-6 py-3">
                <div className="flex items-center gap-2">
                  <AuditIcon status={entry.status} />
                  <span className="font-medium text-zinc-700">
                    {entry.event}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-3">
                {entry.recipient ? (
                  <AddressBadge address={entry.recipient} showCopy={false} />
                ) : (
                  <span className="text-zinc-400">-</span>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-3">
                <span
                  className={`font-medium ${
                    isPositiveAuditAmount(entry)
                      ? "text-emerald-600"
                      : "text-zinc-700"
                  }`}
                >
                  {formatAuditAmount(entry)}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-zinc-400">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
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
      {entries.length === 0 ? (
        <div className="border-t border-zinc-100 px-6 py-10 text-center">
          <p className="text-sm font-medium text-zinc-600">{emptyTitle}</p>
          <p className="mt-1 text-sm text-zinc-400">{emptyDescription}</p>
        </div>
      ) : null}
    </div>
  );
}

function AuditIcon({ status }: { status: AuditLogEntry["status"] }) {
  switch (status) {
    case "Passed":
      return (
        <CheckCircle2
          size={16}
          className="text-emerald-500"
          aria-hidden="true"
        />
      );
    case "Pending":
      return (
        <AlertTriangle
          size={16}
          className="text-amber-500"
          aria-hidden="true"
        />
      );
    case "Blocked":
      return <XCircle size={16} className="text-rose-500" aria-hidden="true" />;
  }
}

function statusDotColor(
  status: AuditLogEntry["status"],
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

function formatAuditAmount(entry: AuditLogEntry) {
  if (!entry.amount) {
    return "-";
  }

  if (entry.amount.includes("USDC")) {
    return entry.amount;
  }

  const prefix = entry.event === "Deposit confirmed" ? "+" : "-";
  return `${prefix}${entry.amount} USDC`;
}

function isPositiveAuditAmount(entry: AuditLogEntry) {
  return entry.event === "Deposit confirmed" || entry.amount?.startsWith("+");
}

function formatRelativeTime(timestamp: number) {
  const elapsedMs = Date.now() - timestamp;
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  if (elapsedSeconds < 60) {
    return "just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}
