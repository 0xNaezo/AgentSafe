"use client";

import { Bot, User, Wrench } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { DEMO_TOKEN_MINT } from "@/lib/solana/config";
import { AgentChatSidebar } from "./agent-chat-sidebar";
import { ChatPanel } from "./chat-panel";
import type { ChatMessage, ChatResponse, HistoryMessage } from "../types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "failed to get a response";
}

export function AgentChat() {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 104)}px`;
    }
  }, [input]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    if (!publicKey) {
      setMessages((prev) => [
        ...prev,
        {
          author: "AgentSafe Agent",
          body: "Error: connect the vault owner wallet before sending a payment request.",
          icon: Bot,
          align: "left",
        },
      ]);
      return;
    }

    if (!DEMO_TOKEN_MINT) {
      setMessages((prev) => [
        ...prev,
        {
          author: "AgentSafe Agent",
          body: "Error: NEXT_PUBLIC_DEMO_TOKEN_MINT is not configured.",
          icon: Bot,
          align: "left",
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      author: "User",
      body: content,
      icon: User,
      align: "right",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const updatedHistory: HistoryMessage[] = [
      ...history,
      { role: "user" as const, content },
    ];
    setHistory(updatedHistory);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory,
          context: {
            owner: publicKey.toBase58(),
            tokenMint: DEMO_TOKEN_MINT,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as ChatResponse;

      if (!res.ok) {
        const serverError =
          data.error ?? `Request failed with status ${res.status}`;
        setMessages((prev) => [
          ...prev,
          {
            author: "AgentSafe Agent",
            body: `Error: ${serverError}`,
            icon: Bot,
            align: "left",
          },
        ]);
        return;
      }

      if (data.messages) {
        setHistory(
          data.messages.filter(
            (message) => message.role !== "tool" && !message.tool_calls,
          ),
        );
      }

      const newMessages: ChatMessage[] = [];

      if (data.toolCalls?.length) {
        for (const tc of data.toolCalls) {
          newMessages.push({
            author: `Tool: ${tc.name}`,
            body: "```json\n" + JSON.stringify(tc.args, null, 2) + "\n```",
            icon: Wrench,
            align: "left",
          });
        }
      }

      if (data.reply) {
        newMessages.push({
          author: "AgentSafe Agent",
          body: data.reply,
          icon: Bot,
          align: "left",
        });
      }

      if (newMessages.length === 0) {
        newMessages.push({
          author: "AgentSafe Agent",
          body: "No response",
          icon: Bot,
          align: "left",
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        author: "AgentSafe Agent",
        body: `Error: ${getErrorMessage(error)}`,
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

  return (
    <section className="grid flex-1 gap-4 py-5 lg:content-start lg:grid-cols-[1fr_0.45fr]">
      <ChatPanel
        messages={messages}
        input={input}
        loading={loading}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onSend={handleSend}
      />
      <AgentChatSidebar />
    </section>
  );
}
