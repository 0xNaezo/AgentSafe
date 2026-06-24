import type { PublicKey } from "@solana/web3.js";

export type ToolCallResult = {
  name: string;
  args: Record<string, unknown>;
};

export type OwnerApprovalRequest = {
  type: "owner_force_transfer";
  reason: "onetime_limit_exceeded";
  recipient: string;
  amount: string;
};

export type ChatExecutionContext = {
  owner: PublicKey;
  tokenMint: PublicKey;
};

export type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<ToolCall>;
  tool_call_id?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type OpenRouterChoice = {
  finish_reason: string;
  message: {
    content: string | null;
    tool_calls?: ToolCall[];
  };
};

export type OpenRouterResult = {
  choice: OpenRouterChoice | null;
  ok: boolean;
  status: number;
  errorBody: string;
};

export type ChatCompletionResult = {
  reply: string;
  toolCalls: ToolCallResult[];
  approvalRequests: OwnerApprovalRequest[];
  messages: ChatMessage[];
};
