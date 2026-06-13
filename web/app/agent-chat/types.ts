import type { LucideIcon } from "lucide-react";

export type ChatMessage = {
  author: string;
  body: string;
  icon: LucideIcon;
  align: "right" | "left";
};

export type HistoryMessage = {
  role: "user" | "assistant" | "tool";
  content: string | null;
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
  label: string;
  value: string;
};

export type PolicyCheck = {
  label: string;
  value: string;
  state: string;
  icon: LucideIcon;
  tone: string;
};
