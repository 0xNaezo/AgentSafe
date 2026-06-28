import { Bot, ShieldCheck, User, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LucideIcon } from "lucide-react";
import { AgentSafeBlink } from "@/app/blinks/render";
import { TransactionToolCard } from "./transaction-tool-card";
import type { ChatMessage, ChatMessageKind } from "../types";

type ChatMessageBubbleProps = {
  message: ChatMessage;
};

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const Icon = messageIconByKind[message.kind];
  const isUser = message.align === "right";
  const isBlink = message.kind === "blink";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && message.kind !== "tool" && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon size={17} aria-hidden="true" />
        </div>
      )}
      <div
        className={`${isBlink ? "w-full max-w-[640px]" : isUser ? "max-w-[500px]" : "max-w-[760px]"} ${
          isUser
            ? "rounded-2xl bg-zinc-900 px-4 py-3 text-white"
            : message.kind === "tool" ? "py-0 text-zinc-800" : "py-2 text-zinc-800"
        }`}
      >
        {!isUser && message.kind !== "tool" && (
          <p className="text-xs font-semibold text-zinc-500">
            {message.author}
          </p>
        )}
        {message.kind === "tool" && message.toolData ? (
          <div className={isUser ? "mt-2" : "mt-0"}>
            <TransactionToolCard
              address={message.toolData.address}
              amount={message.toolData.amount}
            />
          </div>
        ) : isBlink && message.blink ? (
          <div className={isUser ? "mt-2" : "mt-3"}>
            <AgentSafeBlink
              amount={message.blink.amount}
              recipient={message.blink.recipient}
              tokenMint={message.blink.tokenMint}
            />
          </div>
        ) : (
          <>
            {message.imageDataUrl && (
              <div className={isUser ? "mb-2" : "mt-2 mb-2"}>
                <img
                  src={message.imageDataUrl}
                  alt="Attached image"
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />
              </div>
            )}
            {message.body && (
              <div
                className={`prose prose-sm max-w-none leading-6 [&_pre]:p-4 [&_code]:rounded-md [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-medium [&_pre_code]:bg-transparent [&_pre_code]:p-0 ${
                  isUser
                    ? "prose-invert [&_pre]:bg-zinc-800 [&_pre]:text-zinc-100 [&_code]:bg-zinc-800 [&_code]:text-zinc-100"
                    : "prose-zinc mt-2 [&_pre]:bg-zinc-50 [&_pre]:text-zinc-900 [&_pre]:border [&_pre]:border-zinc-200 [&_code]:bg-zinc-100 [&_code]:text-zinc-900"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.body}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const messageIconByKind: Record<ChatMessageKind, LucideIcon> = {
  agent: Bot,
  blink: ShieldCheck,
  tool: Wrench,
  user: User,
};
