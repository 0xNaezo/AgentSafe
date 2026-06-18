import { Bot, LockKeyhole, MessagesSquare } from "lucide-react";
import type { RefObject } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatMessageBubble } from "./chat-message-bubble";
import type { ChatMessage } from "../types";

type ChatPanelProps = {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  locked: boolean;
  unlocking: boolean;
  statusLabel: string;
  unlockError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onUnlock: () => void;
};

export function ChatPanel({
  messages,
  input,
  loading,
  locked,
  unlocking,
  statusLabel,
  unlockError,
  textareaRef,
  onInputChange,
  onSend,
  onUnlock,
}: ChatPanelProps) {
  return (
    <div className="relative flex min-h-0 flex-col">
      <div className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:absolute lg:inset-0 lg:h-full">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <MessagesSquare size={19} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Reference AI intent layer
              </p>
              <h2 className="text-lg font-semibold text-slate-950">
                Payment request chat
              </h2>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            <LockKeyhole size={16} aria-hidden="true" />
            {statusLabel}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">
                Send a message to start the chat.
              </p>
            </div>
          )}
          {messages.map((message, i) => (
            <ChatMessageBubble
              key={`${message.author}-${i}`}
              message={message}
            />
          ))}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                <Bot size={17} aria-hidden="true" />
              </div>
              <div className="max-w-[760px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-800">
                <p className="text-xs font-semibold text-slate-500">
                  AgentSafe Agent
                </p>
                <p className="mt-2 text-sm italic leading-6 text-slate-400">
                  Thinking...
                </p>
              </div>
            </div>
          )}
        </div>

        {locked ? (
          <div className="border-t border-slate-200 p-5">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={unlocking}
                onClick={onUnlock}
                type="button"
              >
                <LockKeyhole size={17} aria-hidden="true" />
                {unlocking ? "Waiting for signature..." : "Sign in to unlock Agent"}
              </button>
              {unlockError && (
                <p className="text-center text-sm font-medium text-rose-600">
                  {unlockError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <ChatComposer
            input={input}
            loading={loading}
            textareaRef={textareaRef}
            onInputChange={onInputChange}
            onSend={onSend}
          />
        )}
      </div>
    </div>
  );
}
