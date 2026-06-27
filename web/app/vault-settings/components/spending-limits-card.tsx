import { UsdcIcon } from "@/app/components/icons/usdc-icon";

import type { VaultLoadState } from "../types";

type SpendingLimitsCardProps = {
  dailyLimit: string;
  hourlyLimit: string;
  onDailyLimitChange: (value: string) => void;
  onHourlyLimitChange: (value: string) => void;
  onPerPaymentCapChange: (value: string) => void;
  perPaymentCap: string;
  vaultLoadState: VaultLoadState;
};

export function SpendingLimitsCard({
  dailyLimit,
  hourlyLimit,
  onDailyLimitChange,
  onHourlyLimitChange,
  onPerPaymentCapChange,
  perPaymentCap,
  vaultLoadState,
}: SpendingLimitsCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-950">
          Spending Limits
        </h2>
        <VaultStatusBadge state={vaultLoadState} />
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        All limits are denominated in USDC and enforced by the on-chain program
        - the UI only previews them.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <LimitField
          label="Daily limit"
          value={dailyLimit}
          onChange={onDailyLimitChange}
          description="Resets every 24h"
        />
        <LimitField
          label="Hourly limit"
          value={hourlyLimit}
          onChange={onHourlyLimitChange}
          description="Rolling 60 min window"
        />
        <LimitField
          label="Per-payment cap"
          value={perPaymentCap}
          onChange={onPerPaymentCapChange}
          description="Above this amount, owner must approve manually"
        />
      </div>
    </div>
  );
}

function LimitField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          <UsdcIcon className="h-4 w-4" />
          <span className="text-xs font-semibold text-zinc-500">USDC</span>
        </span>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function VaultStatusBadge({ state }: { state: VaultLoadState }) {
  const copyByState: Record<VaultLoadState, string> = {
    idle: "Connect wallet",
    loading: "Checking vault",
    exists: "Vault found",
    missing: "No vault yet",
    error: "Check failed",
  };

  const classByState: Record<VaultLoadState, string> = {
    idle: "border-zinc-200 bg-zinc-100 text-zinc-600",
    loading: "border-sky-100 bg-sky-50 text-sky-700",
    exists: "border-emerald-100 bg-emerald-50 text-emerald-700",
    missing: "border-amber-100 bg-amber-50 text-amber-700",
    error: "border-rose-100 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-semibold ${classByState[state]}`}
    >
      {copyByState[state]}
    </span>
  );
}
