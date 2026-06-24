import { Bot, ShieldCheck, User, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LucideIcon } from "lucide-react";
import { AgentSafeBlink } from "@/app/blinks/render";
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
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Icon size={17} aria-hidden="true" />
        </div>
      )}
      <div
        className={`${isBlink ? "w-full max-w-[640px]" : isUser ? "max-w-[500px]" : "max-w-[760px]"} ${
          isUser
            ? "rounded-2xl bg-zinc-900 px-4 py-3 text-white"
            : "py-2 text-zinc-800"
        }`}
      >
        {!isUser && (
          <p className="text-xs font-semibold text-zinc-500">
            {message.author}
          </p>
        )}
        {isBlink && message.blink ? (
          <div className={isUser ? "mt-2" : "mt-3"}>
            <AgentSafeBlink
              amount={message.blink.amount}
              recipient={message.blink.recipient}
              tokenMint={message.blink.tokenMint}
            />
          </div>
        ) : (
          <div
            className={`${isUser ? "" : "mt-2"} text-sm leading-6 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:p-3 ${
              isUser
                ? "[&_code]:bg-zinc-800 [&_pre]:bg-zinc-800"
                : "[&_code]:bg-zinc-100 [&_pre]:bg-zinc-100"
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.body}
            </ReactMarkdown>
          </div>
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
