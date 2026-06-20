import type { LucideIcon } from "lucide-react";
import type { ToolCall } from "@/lib/chat/types";

export type ChatMessageKind = "user" | "agent" | "tool";

export type ChatMessage = {
  author: string;
  body: string;
  align: "right" | "left";
  kind: ChatMessageKind;
};

export type HistoryMessage = {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ChatResponse = {
  reply?: string | null;
  error?: string;
  messages?: HistoryMessage[];
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
};

export type IntentField = {
  id: string;
  label: string;
  value: string;
};

export type PolicyCheckState = "Passed" | "Pending" | "Blocked";

export type PolicyCheck = {
  id: string;
  label: string;
  value: string;
  state: PolicyCheckState;
  icon: LucideIcon;
};
