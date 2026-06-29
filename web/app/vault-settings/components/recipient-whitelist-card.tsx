import { Plus, Trash2 } from "lucide-react";

import { AddressBadge } from "@/app/components/address-badge";

import type { WhitelistEntry } from "../types";

type RecipientWhitelistCardProps = {
  entries: WhitelistEntry[];
  newAddress: string;
  onAddAddress: () => void;
  onNewAddressChange: (value: string) => void;
  onRemoveAddress: (index: number) => void;
};

export function RecipientWhitelistCard({
  entries,
  newAddress,
  onAddAddress,
  onNewAddressChange,
  onRemoveAddress,
}: RecipientWhitelistCardProps) {
  return (
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
          {entries.length} addresses
        </span>
      </div>

      <div className="relative mt-5">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-50/40 backdrop-blur-[2px]">
          <span className="rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur-md">
            Coming Soon
          </span>
        </div>

        <div className="pointer-events-none select-none opacity-50 grayscale-[30%]">
          <div className="divide-y divide-zinc-100">
            {entries.map((entry, index) => (
              <div
                key={`${entry.address}-${index}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2">
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition"
                  disabled
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
              disabled
              onChange={(event) => onNewAddressChange(event.target.value)}
            />
            <button
              type="button"
              className="inline-flex h-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
              disabled
            >
              <Plus size={15} aria-hidden="true" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
