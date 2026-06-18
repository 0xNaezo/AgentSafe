"use client";

import bs58 from "bs58";
import { Bot, User, Wrench } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
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

function buildChatAuthMessage(
  owner: string,
  tokenMint: string,
  issuedAt: number,
) {
  return [
    "AgentSafe Chat Auth",
    `Owner: ${owner}`,
    `TokenMint: ${tokenMint}`,
    `IssuedAt: ${issuedAt}`,
  ].join("\n");
}

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
  const [authorizingChat, setAuthorizingChat] = useState(false);
  const authRequestKeyRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 104)}px`;
    }
  }, [input]);

  useEffect(() => {
    const owner = publicKey?.toBase58();
    const tokenMint = DEMO_TOKEN_MINT;

    if (!owner || !tokenMint) {
      authRequestKeyRef.current = null;
      setChatAuth(null);
      setAuthorizingChat(false);
      return;
    }

    if (!signMessage) {
      setChatAuth(null);
      return;
    }

    const now = Date.now();
    const authKey = `${owner}:${tokenMint}`;
    const hasValidAuth =
      chatAuth?.owner === owner &&
      chatAuth.tokenMint === tokenMint &&
      now - chatAuth.issuedAt < CHAT_AUTH_TTL_MS;

    if (hasValidAuth || authRequestKeyRef.current === authKey) {
      return;
    }

    authRequestKeyRef.current = authKey;
    setAuthorizingChat(true);

    void (async () => {
      const issuedAt = Date.now();
      const signedMessage = buildChatAuthMessage(owner, tokenMint, issuedAt);

      try {
        const signature = await signMessage(
          new TextEncoder().encode(signedMessage),
        );

        if (authRequestKeyRef.current !== authKey) {
          return;
        }

        setChatAuth({
          owner,
          tokenMint,
          signature: bs58.encode(signature),
          signedMessage,
          issuedAt,
        });
      } catch (error) {
        console.error("Failed to authorize chat.", error);

        if (authRequestKeyRef.current !== authKey) {
          return;
        }

        setChatAuth(null);
        setMessages((prev) => [
          ...prev,
          {
            author: "AgentSafe Agent",
            body: `Error: failed to authorize chat: ${getErrorMessage(error)}`,
            icon: Bot,
            align: "left",
          },
        ]);
      } finally {
        if (authRequestKeyRef.current === authKey) {
          setAuthorizingChat(false);
        }
      }
    })();
  }, [chatAuth, publicKey, signMessage]);

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

    const owner = publicKey.toBase58();
    const hasValidAuth =
      chatAuth?.owner === owner &&
      chatAuth.tokenMint === DEMO_TOKEN_MINT &&
      Date.now() - chatAuth.issuedAt < CHAT_AUTH_TTL_MS;

    if (!hasValidAuth) {
      if (chatAuth) {
        authRequestKeyRef.current = null;
        setChatAuth(null);
      }

      setMessages((prev) => [
        ...prev,
        {
          author: "AgentSafe Agent",
          body: authorizingChat
            ? "Error: approve the wallet signature to authorize chat."
            : "Error: chat authorization is missing or expired. Approve the wallet signature to continue.",
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
            owner,
            tokenMint: DEMO_TOKEN_MINT,
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
