import { Bot, LockKeyhole } from "lucide-react";
import type { RefObject } from "react";
import { AddressBadge } from "@/app/components/address-badge";
import { ChatComposer } from "./chat-composer";
import { ChatMessageBubble } from "./chat-message-bubble";
import type { ChatMessage } from "../types";

type ChatPanelProps = {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  locked: boolean;
  restoring: boolean;
  unlocking: boolean;
  statusLabel: string;
  unlockError: string | null;
  imagePreview: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onUnlock: () => void;
  onAttachImage: (dataUrl: string) => void;
  onRemoveImage: () => void;
};

export function ChatPanel({
  messages,
  input,
  loading,
  locked,
  restoring,
  unlocking,
  statusLabel,
  unlockError,
  imagePreview,
  textareaRef,
  onInputChange,
  onSend,
  onUnlock,
  onAttachImage,
  onRemoveImage,
}: ChatPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-lg border border-zinc-200 bg-zinc-50 min-h-0">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Bot size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                AgentSafe Agent
              </h2>
              <div className="mt-0.5 flex items-center gap-1">
                <AddressBadge
                  address="3Kp9mNt2"
                  label="Agent wallet"
                  truncateChars={4}
                  showCopy
                  className="text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!locked && !restoring && (
              <div className="flex items-center gap-2 text-base font-medium text-zinc-600">
                {statusLabel}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-5 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex h-full flex-1 items-center justify-center">
              <p className="text-sm text-zinc-400">
                Send a message to start the chat.
              </p>
            </div>
          )}
          {messages.map((message, i) => {
            const isConsecutiveTool =
              i > 0 &&
              messages[i - 1].kind === "tool" &&
              message.kind === "tool";
            return (
              <div
                key={`${message.author}-${i}`}
                className={i === 0 ? "" : isConsecutiveTool ? "mt-1" : "mt-4"}
              >
                <ChatMessageBubble message={message} />
              </div>
            );
          })}
          {loading && (
            <div
              className={`flex justify-start gap-3 ${
                messages.length > 0 ? "mt-4" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Bot size={17} aria-hidden="true" />
              </div>
              <div className="max-w-[760px] p-4 text-zinc-800">
                <p className="text-xs font-semibold text-zinc-500">
                  AgentSafe Agent
                </p>
                <p className="mt-2 text-sm italic leading-6 text-zinc-400">
                  Thinking...
                </p>
              </div>
            </div>
          )}
        </div>

        {restoring ? null : locked ? (
          <div className="shrink-0 border-t border-zinc-200 p-5">
            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <button
                aria-busy={unlocking}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white  transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={unlocking}
                onClick={onUnlock}
                type="button"
              >
                <LockKeyhole size={17} aria-hidden="true" />
                {unlocking
                  ? "Waiting for signature..."
                  : "Sign in to unlock Agent"}
              </button>
              {unlockError && (
                <p
                  className="text-center text-sm font-medium text-rose-600"
                  role="alert"
                >
                  {unlockError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <ChatComposer
            input={input}
            loading={loading}
            imagePreview={imagePreview}
            textareaRef={textareaRef}
            onInputChange={onInputChange}
            onSend={onSend}
            onAttachImage={onAttachImage}
            onRemoveImage={onRemoveImage}
          />
        )}
      </div>
    </div>
  );
}
