import { Bot, User, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LucideIcon } from "lucide-react";
import type { ChatMessage, ChatMessageKind } from "../types";

type ChatMessageBubbleProps = {
  message: ChatMessage;
};

/**
 * Renders a chat message bubble with markdown support and an avatar icon.
 *
 * Displays the message author name and markdown-formatted body in a styled bubble.
 * Positions an avatar icon (selected by message kind) on the left for non-user
 * messages or on the right for user messages. Applies distinct styling for user
 * versus non-user messages.
 *
 * @param message - The chat message to display
 */
export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const Icon = messageIconByKind[message.kind];
  const isUser = message.align === "right";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
          <Icon size={17} aria-hidden="true" />
        </div>
      )}
      <div
        className={`max-w-[760px] rounded-lg border p-4 ${
          isUser
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-slate-200 bg-slate-50 text-slate-800"
        }`}
      >
        <p
          className={`text-xs font-semibold ${isUser ? "text-slate-300" : "text-slate-500"}`}
        >
          {message.author}
        </p>
        <div
          className={`mt-2 text-sm leading-6 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:p-3 ${
            isUser
              ? "[&_code]:bg-slate-800 [&_pre]:bg-slate-800"
              : "[&_code]:bg-slate-100 [&_pre]:bg-slate-100"
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.body}
          </ReactMarkdown>
        </div>
      </div>
      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
          <Icon size={17} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

const messageIconByKind: Record<ChatMessageKind, LucideIcon> = {
  agent: Bot,
  tool: Wrench,
  user: User,
};
