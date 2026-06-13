import { ArrowRight, FileText } from "lucide-react";
import type { IntentField } from "../types";

type PaymentDraftCardProps = {
  intentFields: IntentField[];
};

export function PaymentDraftCard({ intentFields }: PaymentDraftCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Parsed intent</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Payment draft</h2>
        </div>
        <FileText className="text-slate-500" size={21} aria-hidden="true" />
      </div>

      <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4">
        {intentFields.map((field) => (
          <div key={field.id} className="grid grid-cols-[0.7fr_1fr] gap-3 py-3 text-sm">
            <span className="font-medium text-slate-500">{field.label}</span>
            <span className="min-w-0 break-words font-semibold text-slate-950">
              {field.value}
            </span>
          </div>
        ))}
      </div>

      <button
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        type="button"
      >
        Create pending request
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
