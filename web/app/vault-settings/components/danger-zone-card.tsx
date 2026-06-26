import { SlidersHorizontal, StopCircle } from "lucide-react";

export function DangerZoneCard() {
  return (
    <div className="rounded-xl bg-rose-50/50 p-6">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <StopCircle size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-600">Danger Zone</h2>
            <p className="mt-1 text-sm font-bold text-zinc-900">Pause Vault</p>
            <p className="mt-1 text-sm text-zinc-500">
              Immediately blocks all AI-initiated operations until you manually
              resume. Deposits and owner withdrawals remain available.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
              <SlidersHorizontal size={13} aria-hidden="true" />
              You&rsquo;ll be asked to confirm: &ldquo;Are you absolutely sure?
              This blocks all AI operations.&rdquo;
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 text-sm font-bold text-white  transition hover:bg-zinc-800"
        >
          <StopCircle size={15} aria-hidden="true" />
          PAUSE VAULT
        </button>
      </div>
    </div>
  );
}
