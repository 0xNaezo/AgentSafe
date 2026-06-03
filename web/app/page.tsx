import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "./components/app-shell";

const policyRules = [
  { label: "Daily spend limit", value: "900 USDC", state: "Active" },
  { label: "Manual review over", value: "150 USDC", state: "Review" },
  { label: "Vault token", value: "USDC", state: "Locked" },
  { label: "Agent signature", value: "3c4F...8b92", state: "Required" },
];

const dailySpend = {
  current: 312,
  limit: 900,
};

const activity = [
  {
    title: "Payment request approved",
    detail: "Agent paid OpenAI API for 42.00 USDC",
    time: "2 min ago",
    icon: CheckCircle2,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
  },
  {
    title: "Manual approval queued",
    detail: "Cloud GPU Pool requested 180.00 USDC",
    time: "16 min ago",
    icon: Clock3,
    tone: "text-amber-700 bg-amber-50 border-amber-100",
  },
];

export default function Home() {
  return (
    <AppShell activeHref="/" title="Policy Vault Dashboard">
        <section className="grid gap-4 py-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Vault balance</p>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-4xl font-semibold tracking-normal text-slate-950">
                    2,840.00
                  </span>
                  <span className="pb-1 text-lg font-semibold text-slate-500">USDC</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <LockKeyhole size={16} aria-hidden="true" />
                Policy enforced
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric icon={Bot} label="Agent wallet" value="3c4F...8b92" />
              <DailySpendMetric current={dailySpend.current} limit={dailySpend.limit} />
              <Metric icon={Activity} label="Pending review" value="1 request" />
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                  <CircleDollarSign size={17} aria-hidden="true" />
                  Deposit
                </button>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                  <SlidersHorizontal size={17} aria-hidden="true" />
                  Edit policy
                </button>
              </div>
              <div className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:ml-auto">
                <span className="font-medium text-slate-500">Vault Address:</span>
                <span className="font-mono font-semibold text-slate-950">4k3...x92</span>
                <button
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                  aria-label="Copy vault address"
                  title="Copy vault address"
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Risk preview</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Next agent payment</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700">
                <TriangleAlert size={19} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Recipient</span>
                <span className="font-semibold text-slate-950">Cloud GPU Pool</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Amount</span>
                <span className="font-semibold text-slate-950">180.00 USDC</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">Decision</span>
                <span className="font-semibold text-amber-700">Needs owner approval</span>
              </div>
            </div>

            <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              Review request
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="grid flex-1 gap-4 pb-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Policy</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Active constraints</h2>
              </div>
              <ShieldCheck className="text-slate-500" size={21} aria-hidden="true" />
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {policyRules.map((rule) => (
                <div key={rule.label} className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{rule.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{rule.value}</p>
                  </div>
                  <span className="self-start rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                    {rule.state}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Activity</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Recent agent requests</h2>
              </div>
              <Activity className="text-slate-500" size={21} aria-hidden="true" />
            </div>

            <div className="mt-5 space-y-3">
              {activity.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="text-xs font-medium text-slate-500">{item.time}</p>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

    </AppShell>
  );
}

type IconComponent = typeof ShieldCheck;

function Metric({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={17} aria-hidden="true" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 truncate text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DailySpendMetric({ current, limit }: { current: number; limit: number }) {
  const percent = Math.min((current / limit) * 100, 100);
  const progressTone = percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const textTone = percent >= 90 ? "text-rose-700" : percent >= 70 ? "text-amber-700" : "text-emerald-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <CircleDollarSign size={17} aria-hidden="true" />
        <p className="text-sm font-medium">Spent today</p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="truncate text-base font-semibold text-slate-950">{current} / {limit} USDC</p>
        <p className={`text-xs font-bold ${textTone}`}>{Math.round(percent)}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200" aria-label={`Spent today ${current} of ${limit} USDC`}>
        <div className={`h-full rounded-full ${progressTone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
