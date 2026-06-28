import { ArrowRight } from "lucide-react";

type TransactionToolCardProps = {
  address: string;
  amount: string;
};

export function TransactionToolCard({ address, amount }: TransactionToolCardProps) {
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm">
      <ArrowRight size={16} className="text-zinc-500 shrink-0" />
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-600">
        <span>Transfer request:</span>
        <span className="font-semibold text-zinc-900">{amount} USDC</span>
        <span>to</span>
        <div className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 shadow-sm">
          <span className="font-mono text-xs text-zinc-500">{shortAddress}</span>
        </div>
      </div>
    </div>
  );
}
