import { ShieldCheck } from "lucide-react";
import type { PolicyCheck, PolicyCheckState } from "../types";

type PolicyChecksCardProps = {
  policyChecks: PolicyCheck[];
};

const toneClasses: Record<PolicyCheckState, string> = {
  Passed: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-100 bg-amber-50 text-amber-700",
  Blocked: "border-rose-100 bg-rose-50 text-rose-700",
};

export function PolicyChecksCard({ policyChecks }: PolicyChecksCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 ">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            Vault decision preview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            Policy checks
          </h2>
        </div>
        <ShieldCheck className="text-zinc-500" size={21} aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-3">
        {policyChecks.map((check) => {
          const Icon = check.icon;

          return (
            <div
              key={check.id}
              className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${toneClasses[check.state]}`}
              >
                <Icon size={17} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950">
                  {check.label}
                </p>
                <p className="mt-1 break-words text-sm text-zinc-500">
                  {check.value}
                </p>
              </div>
              <span className="w-fit rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600">
                {check.state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
