"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  MessagesSquare,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type ChatMessage = {
  author: string;
  body: string;
  icon: typeof User | typeof Bot;
  align: "right" | "left";
};

const intentFields = [
  { label: "Recipient", value: "Cloud GPU Pool" },
  { label: "Wallet", value: "Hk31...m2Ls" },
  { label: "Amount", value: "180.00 USDC" },
  { label: "Reference", value: "training-run-june-demo" },
];

const policyChecks = [
  {
    label: "Assigned agent wallet",
    value: "3c4F...8b92",
    state: "Passed",
    icon: CheckCircle2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    label: "Agent signature valid",
    value: "Request signed by assigned agent",
    state: "Passed",
    icon: CheckCircle2,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    label: "Manual approval threshold",
    value: "Over 150 USDC",
    state: "Pending",
    icon: Clock3,
    tone: "border-amber-100 bg-amber-50 text-amber-700",
  },
  {
    label: "Unsafe amount example",
    value: "Full vault withdrawal",
    state: "Blocked",
    icon: XCircle,
    tone: "border-rose-100 bg-rose-50 text-rose-700",
  },
];

const promptExamples = [
  "Pay OpenAI API 42 USDC for usage",
  "Create approval request for Cloud GPU Pool, 180 USDC",
  "Show why full vault withdrawal is blocked",
];

export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMessage: ChatMessage = {
      author: "User",
      body: content,
      icon: User,
      align: "right",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const data = await res.json();

      const botMessage: ChatMessage = {
        author: "AgentSafe Agent",
        body: data.reply ?? "No response",
        icon: Bot,
        align: "left",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        author: "AgentSafe Agent",
        body: "Error: failed to get a response. Make sure OPENROUTER_API_KEY is set.",
        icon: Bot,
        align: "left",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <section className="grid flex-1 gap-4 py-5 lg:grid-cols-[1fr_0.45fr]">
        <div className="flex min-h-[720px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                <MessagesSquare size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Reference AI intent layer</p>
                <h2 className="text-lg font-semibold text-slate-950">Payment request chat</h2>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
              <LockKeyhole size={16} aria-hidden="true" />
              Agent is not custodian
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">Send a message to start the chat.</p>
              </div>
            )}
            {messages.map((message, i) => {
              const Icon = message.icon;
              const isUser = message.align === "right";

              return (
                <div key={i} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <Icon size={17} aria-hidden="true" />
                    </div>
                  )}
                  <div className={`max-w-[760px] rounded-lg border p-4 ${isUser ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    <p className={`text-xs font-semibold ${isUser ? "text-slate-300" : "text-slate-500"}`}>
                      {message.author}
                    </p>
                    <p className="mt-2 text-sm leading-6">{message.body}</p>
                  </div>
                  {isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                      <Icon size={17} aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                  <Bot size={17} aria-hidden="true" />
                </div>
                <div className="max-w-[760px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-800">
                  <p className="text-xs font-semibold text-slate-500">AgentSafe Agent</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400 italic">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {promptExamples.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="agent-message">Message</label>
              <textarea
                id="agent-message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={loading}
                className="min-h-24 resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                type="button"
              >
                <Send size={17} aria-hidden="true" />
                Send
              </button>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Parsed intent</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Payment draft</h2>
              </div>
              <FileText className="text-slate-500" size={21} aria-hidden="true" />
            </div>

            <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4">
              {intentFields.map((field) => (
                <div key={field.label} className="grid grid-cols-[0.7fr_1fr] gap-3 py-3 text-sm">
                  <span className="font-medium text-slate-500">{field.label}</span>
                  <span className="min-w-0 break-words font-semibold text-slate-950">{field.value}</span>
                </div>
              ))}
            </div>

            <button className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800" type="button">
              Create pending request
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Vault decision preview</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Policy checks</h2>
              </div>
              <ShieldCheck className="text-slate-500" size={21} aria-hidden="true" />
            </div>

            <div className="mt-5 space-y-3">
              {policyChecks.map((check) => {
                const Icon = check.icon;

                return (
                  <div key={check.label} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${check.tone}`}>
                      <Icon size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{check.label}</p>
                      <p className="mt-1 break-words text-sm text-slate-500">{check.value}</p>
                    </div>
                    <span className="w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                      {check.state}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
