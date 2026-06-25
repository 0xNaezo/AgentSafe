import { ArrowUp, Paperclip, X } from "lucide-react";
import { useRef, type KeyboardEvent, type RefObject } from "react";

type ChatComposerProps = {
  input: string;
  loading: boolean;
  imagePreview: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onAttachImage: (dataUrl: string) => void;
  onRemoveImage: () => void;
};

export function ChatComposer({
  input,
  loading,
  imagePreview,
  textareaRef,
  onInputChange,
  onSend,
  onAttachImage,
  onRemoveImage,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    // Limit to 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        onAttachImage(reader.result);
      }
    };

    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  const hasContent = input.trim().length > 0 || imagePreview !== null;

  return (
    <div className="shrink-0 border-t border-zinc-200 px-5 py-3">
      {imagePreview && (
        <div className="mb-2 flex items-start gap-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Attached preview"
              className="h-20 w-20 rounded-lg border border-zinc-200 object-cover"
            />
            <button
              type="button"
              onClick={onRemoveImage}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700"
              aria-label="Remove attachment"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className="flex flex-1 items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Attach image"
            onClick={handleAttachClick}
            disabled={loading}
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
          disabled={loading || !hasContent}
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
