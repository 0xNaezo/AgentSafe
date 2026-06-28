import type { LucideIcon } from "lucide-react";
import type { MessageContent, ToolCall } from "@/lib/chat/types";

export type ChatBlink = {
  type: "owner_force_transfer";
  reason: "onetime_limit_exceeded";
  recipient: string;
  amount: string;
  tokenMint: string;
};

export type ToolExecutionData = {
  address: string;
  amount: string;
};

export type ChatMessageKind = "user" | "agent" | "tool" | "blink";

export type ChatMessage = {
  author: string;
  body: string;
  align: "right" | "left";
  kind: ChatMessageKind;
  blink?: ChatBlink;
  toolData?: ToolExecutionData;
  imageDataUrl?: string;
};

export type ChatAuth = {
  owner: string;
  tokenMint: string;
  signature: string;
  signedMessage: string;
  issuedAt: number;
};

export type HistoryMessage = {
  role: "user" | "assistant" | "tool";
  content: MessageContent;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type StoredChatSession = {
  owner: string;
  tokenMint: string;
  messages: ChatMessage[];
  history: HistoryMessage[];
  chatAuth: ChatAuth | null;
};

export type InitialChatSession = Pick<
  StoredChatSession,
  "messages" | "history" | "chatAuth"
>;

export type ChatResponse = {
  reply?: string | null;
  error?: string;
  messages?: HistoryMessage[];
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  approvalRequests?: ChatBlink[];
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
