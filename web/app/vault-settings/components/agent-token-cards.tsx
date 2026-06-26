import { Lock } from "lucide-react";

import { generateIdenticonGradient } from "@/app/components/address-badge";
import { StatusDot } from "@/app/components/status-dot";

import { DEFAULT_AGENT_ADDRESS } from "../data";

type AgentTokenCardsProps = {
  agentAddress: string;
  tokenMint: string;
};

export function AgentTokenCards({
  agentAddress,
  tokenMint,
}: AgentTokenCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
              background: generateIdenticonGradient(DEFAULT_AGENT_ADDRESS),
            }}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-mono text-sm font-semibold text-zinc-950">
              {agentAddress}
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
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-semibold text-zinc-950">
              USD Coin
            </span>
            <span className="truncate font-mono text-xs text-zinc-500">
              {tokenMint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
