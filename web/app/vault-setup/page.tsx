import {
  Bot,
  CircleDollarSign,
  Copy,
  Info,
  ListChecks,
  LockKeyhole,
  Pause,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AppShell } from "../components/app-shell";

const setupChecks = [
  "Owner controls configuration and approvals",
  "Agent wallet may only initiate payment requests",
  "One vault controls one token mint in the MVP",
  "Critical policy checks are enforced on-chain",
];

export default function VaultSetupPage() {
  return (
    <AppShell activeHref="/vault-setup" title="Vault Setup">
      <section className="grid gap-4 py-5 lg:grid-cols-[1fr_0.42fr]">
        <form className="grid gap-4" aria-label="Vault policy configuration">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Create vault</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Owner and agent</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <ShieldCheck size={16} aria-hidden="true" />
                Policy draft
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Vault owner wallet" htmlFor="owner-wallet" icon={Wallet}>
                <input
                  id="owner-wallet"
                  name="owner-wallet"
                  className="field-control"
                  defaultValue="Connected owner wallet"
                  placeholder="Connect wallet to fill owner address"
                />
              </Field>
              <Field label="Vault Address (PDA)" htmlFor="vault-address" icon={LockKeyhole}>
                <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-slate-400">
                  <input
                    id="vault-address"
                    name="vault-address"
                    className="min-h-11 min-w-0 border-0 bg-transparent px-3 font-mono text-sm font-semibold text-slate-950 outline-none"
                    defaultValue="4k3...x92"
                    readOnly
                  />
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center border-l border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    type="button"
                    aria-label="Copy vault address"
                    title="Copy vault address"
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                </div>
              </Field>
              <Field label="Assigned agent wallet" htmlFor="agent-wallet" icon={Bot}>
                <input
                  id="agent-wallet"
                  name="agent-wallet"
                  className="field-control font-mono"
                  defaultValue="3c4F...8b92"
                  placeholder="Agent wallet public key"
                />
              </Field>
              <Field label="Vault token mint" htmlFor="token-mint" icon={LockKeyhole}>
                <select id="token-mint" name="token-mint" className="field-control">
                  <option>USDC</option>
                  <option>SOL demo token</option>
                </select>
              </Field>
              <Field label="Initial deposit" htmlFor="initial-deposit" icon={CircleDollarSign}>
                <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-slate-400">
                  <input
                    id="initial-deposit"
                    name="initial-deposit"
                    className="min-h-11 min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-slate-950 outline-none"
                    defaultValue="500"
                    inputMode="decimal"
                  />
                  <span className="flex items-center border-l border-slate-200 px-3 text-sm font-semibold text-slate-500">
                    USDC
                  </span>
                </div>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Policy model</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Spending limits</h2>
              </div>
              <ListChecks className="text-slate-500" size={21} aria-hidden="true" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <LimitField label="Daily spending limit" value="900" />
              <LimitField label="Manual approval over" value="150" />
            </div>

            <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-950">Pause switch</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Owner can immediately stop agent-initiated activity while keeping funds in the vault.
                </p>
              </div>
              <label className="inline-flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <input className="h-4 w-4 accent-slate-950" type="checkbox" name="pause-vault" />
                <Pause size={16} aria-hidden="true" />
                Paused
              </label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <button className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50" type="button">
              Save draft
            </button>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800" type="button">
              <ShieldCheck size={17} aria-hidden="true" />
              Create vault
            </button>
          </div>
        </form>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
                <Info size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">MVP constraint</p>
                <h2 className="text-lg font-semibold text-slate-950">One mint, one policy</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              The first AgentSafe vault stores funds in a program-controlled account and checks one active policy before a transfer can move.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Policy checklist</p>
            <div className="mt-4 divide-y divide-slate-100">
              {setupChecks.map((check) => (
                <div key={check} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={17} aria-hidden="true" />
                  <p className="text-sm leading-6 text-slate-700">{check}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

type FieldProps = {
  children: React.ReactNode;
  htmlFor: string;
  icon: typeof ShieldCheck;
  label: string;
};

function Field({ children, htmlFor, icon: Icon, label }: FieldProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700" htmlFor={htmlFor}>
        <Icon size={16} aria-hidden="true" />
        {label}
      </label>
      {children}
    </div>
  );
}

function LimitField({ label, value }: { label: string; value: string }) {
  const inputId = label.toLowerCase().replaceAll(" ", "-");

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-slate-400">
        <input
          id={inputId}
          className="min-h-11 min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-slate-950 outline-none"
          defaultValue={value}
          inputMode="decimal"
        />
        <span className="flex items-center border-l border-slate-200 px-3 text-sm font-semibold text-slate-500">
          USDC
        </span>
      </div>
    </label>
  );
}
