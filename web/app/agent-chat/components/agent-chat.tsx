"use client";

import bs58 from "bs58";
import { Bot, User, Wrench } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { buildChatAuthMessage } from "@/lib/chat/auth-message";
import { DEMO_TOKEN_MINT } from "@/lib/solana/config";
import { AgentChatSidebar } from "./agent-chat-sidebar";
import { ChatPanel } from "./chat-panel";
import type { ChatMessage, ChatResponse, HistoryMessage } from "../types";

const CHAT_AUTH_TTL_MS = 60 * 60 * 1000;

type ChatAuth = {
  owner: string;
  tokenMint: string;
  signature: string;
  signedMessage: string;
  issuedAt: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "failed to get a response";
}

export function AgentChat() {
  const { publicKey, signMessage } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatAuth, setChatAuth] = useState<ChatAuth | null>(null);
  const [unlockingChat, setUnlockingChat] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 104)}px`;
    }
  }, [input]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, []);

  const owner = publicKey?.toBase58() ?? null;
  const tokenMint = DEMO_TOKEN_MINT;
  const chatAuthExpiresAt = chatAuth ? chatAuth.issuedAt + CHAT_AUTH_TTL_MS : 0;
  const isChatUnlocked =
    Boolean(owner) &&
    Boolean(tokenMint) &&
    chatAuth?.owner === owner &&
    chatAuth.tokenMint === tokenMint &&
    now < chatAuthExpiresAt;

  const remainingMinutes = Math.max(
    0,
    Math.ceil((chatAuthExpiresAt - now) / 60_000),
  );
  const chatStatusLabel = isChatUnlocked
    ? `Agent unlocked: ${remainingMinutes}m left`
    : "Agent locked";

  async function authorizeChat() {
    setUnlockError(null);

    if (!owner) {
      setUnlockError("Connect the vault owner wallet before unlocking chat.");
      return;
    }

    if (!tokenMint) {
      setUnlockError("NEXT_PUBLIC_DEMO_TOKEN_MINT is not configured.");
      return;
    }

    if (!signMessage) {
      setUnlockError("Connected wallet does not support message signing.");
      return;
    }

    setUnlockingChat(true);

    try {
      const issuedAt = Date.now();
      const signedMessage = buildChatAuthMessage(owner, tokenMint, issuedAt);
      const signature = await signMessage(
        new TextEncoder().encode(signedMessage),
      );

      setChatAuth({
        owner,
        tokenMint,
        signature: bs58.encode(signature),
        signedMessage,
        issuedAt,
      });
      setNow(Date.now());
      setUnlockError(null);
    } catch (error) {
      console.error("Failed to authorize chat.", error);
      setChatAuth(null);
      setUnlockError(`Failed to authorize chat: ${getErrorMessage(error)}`);
    } finally {
      setUnlockingChat(false);
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    if (!isChatUnlocked || !owner || !tokenMint || !chatAuth) {
      setUnlockError("Sign in to unlock the agent before sending a message.");
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
            owner,
            tokenMint,
          },
          auth: {
            signature: chatAuth.signature,
            signedMessage: chatAuth.signedMessage,
            issuedAt: chatAuth.issuedAt,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as ChatResponse;

      if (!res.ok) {
        const serverError =
          data.error ?? `Request failed with status ${res.status}`;

        if (res.status === 401) {
          setChatAuth(null);
          setUnlockError("Chat authorization expired. Sign in again.");
        }

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
        locked={!isChatUnlocked}
        unlocking={unlockingChat}
        statusLabel={chatStatusLabel}
        unlockError={unlockError}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onSend={handleSend}
        onUnlock={authorizeChat}
      />
      <AgentChatSidebar />
    </section>
  );
}
