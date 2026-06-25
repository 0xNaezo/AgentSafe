import { ArrowUp, Paperclip } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";

type ChatComposerProps = {
  input: string;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
};

export function ChatComposer({
  input,
  loading,
  textareaRef,
  onInputChange,
  onSend,
}: ChatComposerProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-zinc-200 px-5 py-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-1 items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600"
            aria-label="Attach file"
          >
            <Paperclip size={18} aria-hidden="true" />
          </button>
          <label className="sr-only" htmlFor="agent-message">
            Message
          </label>
          <textarea
            ref={textareaRef}
            id="agent-message"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent to make a payment..."
            disabled={loading}
            className="flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-sm leading-6 text-zinc-950 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ height: "36px" }}
          />
        </div>
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white  transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          aria-label="Send message"
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
