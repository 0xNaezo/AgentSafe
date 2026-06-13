import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { IntentField, PolicyCheck } from "./types";

export const intentFields: IntentField[] = [
  { id: "recipient", label: "Recipient", value: "Cloud GPU Pool" },
  { id: "wallet", label: "Wallet", value: "Hk31...m2Ls" },
  { id: "amount", label: "Amount", value: "180.00 USDC" },
  { id: "reference", label: "Reference", value: "training-run-june-demo" },
];

export const policyChecks: PolicyCheck[] = [
  {
    id: "assigned-agent-wallet",
    label: "Assigned agent wallet",
    value: "3c4F...8b92",
    state: "Passed",
    icon: CheckCircle2,
  },
  {
    id: "agent-signature-valid",
    label: "Agent signature valid",
    value: "Request signed by assigned agent",
    state: "Passed",
    icon: CheckCircle2,
  },
  {
    id: "manual-approval-threshold",
    label: "Manual approval threshold",
    value: "Over 150 USDC",
    state: "Pending",
    icon: Clock3,
  },
  {
    id: "unsafe-amount-example",
    label: "Unsafe amount example",
    value: "Full vault withdrawal",
    state: "Blocked",
    icon: XCircle,
  },
];
