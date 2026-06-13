import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { IntentField, PolicyCheck } from "./types";

export const intentFields: IntentField[] = [
  { label: "Recipient", value: "Cloud GPU Pool" },
  { label: "Wallet", value: "Hk31...m2Ls" },
  { label: "Amount", value: "180.00 USDC" },
  { label: "Reference", value: "training-run-june-demo" },
];

export const policyChecks: PolicyCheck[] = [
  {
    label: "Assigned agent wallet",
    value: "3c4F...8b92",
    state: "Passed",
    icon: CheckCircle2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    label: "Agent signature valid",
    value: "Request signed by assigned agent",
    state: "Passed",
    icon: CheckCircle2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    label: "Manual approval threshold",
    value: "Over 150 USDC",
    state: "Pending",
    icon: Clock3,
    tone: "border-amber-100 bg-amber-50 text-amber-700",
  },
  {
    label: "Unsafe amount example",
    value: "Full vault withdrawal",
    state: "Blocked",
    icon: XCircle,
    tone: "border-rose-100 bg-rose-50 text-rose-700",
  },
];
