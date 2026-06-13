import { intentFields, policyChecks } from "../data";
import { PaymentDraftCard } from "./payment-draft-card";
import { PolicyChecksCard } from "./policy-checks-card";

export function AgentChatSidebar() {
  return (
    <aside className="grid content-start gap-4">
      <PaymentDraftCard intentFields={intentFields} />
      <PolicyChecksCard policyChecks={policyChecks} />
    </aside>
  );
}
