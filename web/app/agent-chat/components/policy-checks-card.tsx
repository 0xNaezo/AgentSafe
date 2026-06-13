import { ShieldCheck } from "lucide-react";
import type { PolicyCheck } from "../types";

type PolicyChecksCardProps = {
  policyChecks: PolicyCheck[];
};

export function PolicyChecksCard({ policyChecks }: PolicyChecksCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Vault decision preview</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Policy checks</h2>
        </div>
        <ShieldCheck className="text-slate-500" size={21} aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-3">
        {policyChecks.map((check) => {
          const Icon = check.icon;

          return (
            <div
              key={check.label}
              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${check.tone}`}>
                <Icon size={17} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{check.label}</p>
                <p className="mt-1 break-words text-sm text-slate-500">{check.value}</p>
              </div>
              <span className="w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                {check.state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
