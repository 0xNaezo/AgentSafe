import { Send } from "lucide-react";
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
    <div className="border-t border-slate-200 p-5">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="agent-message">
          Message
        </label>
        <textarea
          ref={textareaRef}
          id="agent-message"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
          className="resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ height: "52px" }}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          type="button"
        >
          <Send size={17} aria-hidden="true" />
          Send
        </button>
      </div>
    </div>
  );
}
