"use client";

import bs58 from "bs58";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import {
  buildChatAuthMessage,
  CHAT_AUTH_TTL_MS,
} from "@/lib/chat/auth-message";
import { DEMO_TOKEN_MINT } from "@/lib/solana/config";
import {
  getChatSessionStorageKey,
  getInitialChatSession,
  isChatAuthValid,
  writeStoredChatSession,
} from "../chat-session-storage";
import { AgentChatSidebar } from "./agent-chat-sidebar";
import { ChatPanel } from "./chat-panel";
import type {
  ChatAuth,
  ChatMessage,
  ChatResponse,
  HistoryMessage,
  StoredChatSession,
} from "../types";

type SignMessage = ReturnType<typeof useWallet>["signMessage"];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "failed to get a response";
}

export function AgentChat() {
  const { publicKey, signMessage } = useWallet();
  const owner = publicKey?.toBase58() ?? null;
  const tokenMint = DEMO_TOKEN_MINT;
  const storageKey =
    owner && tokenMint ? getChatSessionStorageKey(owner, tokenMint) : null;

  return (
    <AgentChatSession
      key={storageKey ?? "agent-chat-locked"}
      owner={owner}
      signMessage={signMessage}
      storageKey={storageKey}
      tokenMint={tokenMint}
    />
  );
}

function AgentChatSession({
  owner,
  signMessage,
  storageKey,
  tokenMint,
}: {
  owner: string | null;
  signMessage: SignMessage;
  storageKey: string | null;
  tokenMint: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatAuth, setChatAuth] = useState<ChatAuth | null>(null);
  const [unlockingChat, setUnlockingChat] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const [now, setNow] = useState(() => Date.now());
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

  useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const session = getInitialChatSession(storageKey, owner, tokenMint);
      setMessages(session.messages);
      setHistory(session.history);
      setChatAuth(session.chatAuth);
      setUnlockError(null);
      setIsSessionRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, [owner, storageKey, tokenMint]);

  useEffect(() => {
    if (!isSessionRestored || !storageKey || !owner || !tokenMint) {
      return;
    }

    const chatAuthToStore = isChatAuthValid(chatAuth, Date.now())
      ? chatAuth
      : null;
    const session: StoredChatSession = {
      owner,
      tokenMint,
      messages,
      history,
      chatAuth: chatAuthToStore,
    };

    writeStoredChatSession(storageKey, session);
  }, [
    chatAuth,
    history,
    isSessionRestored,
    messages,
    owner,
    storageKey,
    tokenMint,
  ]);

  useEffect(() => {
    if (!storageKey || !owner || !tokenMint || !chatAuth) {
      return;
    }

    const msUntilExpiry = chatAuth.issuedAt + CHAT_AUTH_TTL_MS - Date.now();
    const expireStoredAuth = () => {
      writeStoredChatSession(storageKey, {
        owner,
        tokenMint,
        messages,
        history,
        chatAuth: null,
      });
    };

    if (msUntilExpiry <= 0) {
      expireStoredAuth();
      return;
    }

    const timeoutId = window.setTimeout(expireStoredAuth, msUntilExpiry);

    return () => window.clearTimeout(timeoutId);
  }, [chatAuth, history, messages, owner, storageKey, tokenMint]);

  const chatAuthExpiresAt = chatAuth ? chatAuth.issuedAt + CHAT_AUTH_TTL_MS : 0;
  const isChatUnlocked =
    isSessionRestored &&
    Boolean(owner) &&
    Boolean(tokenMint) &&
    chatAuth?.owner === owner &&
    chatAuth.tokenMint === tokenMint &&
    now < chatAuthExpiresAt;

  const remainingMinutes = Math.max(
    0,
    Math.ceil((chatAuthExpiresAt - now) / 60_000),
  );
  const chatStatusLabel = !isSessionRestored
    ? "Restoring session..."
    : isChatUnlocked
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
      align: "right",
      kind: "user",
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
            align: "left",
            kind: "agent",
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
            align: "left",
            kind: "tool",
          });
        }
      }

      if (data.approvalRequests?.length) {
        for (const approvalRequest of data.approvalRequests) {
          newMessages.push({
            author: "Owner approval required",
            body: "Approve the transfer with the vault owner wallet.",
            align: "left",
            kind: "blink",
            blink: approvalRequest,
          });
        }
      }

      if (data.reply) {
        newMessages.push({
          author: "AgentSafe Agent",
          body: data.reply,
          align: "left",
          kind: "agent",
        });
      }

      if (newMessages.length === 0) {
        newMessages.push({
          author: "AgentSafe Agent",
          body: "No response",
          align: "left",
          kind: "agent",
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        author: "AgentSafe Agent",
        body: `Error: ${getErrorMessage(error)}`,
        align: "left",
        kind: "agent",
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
        locked={isSessionRestored && !isChatUnlocked}
        restoring={!isSessionRestored}
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
