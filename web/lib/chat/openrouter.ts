import { chatTools } from "./tools";
import type { ChatMessage, OpenRouterChoice, OpenRouterResult } from "./types";

const OPENROUTER_MODEL = "qwen/qwen3.6-flash";
const DEFAULT_OPENROUTER_TIMEOUT_MS = 30_000;

function getOpenRouterTimeoutMs() {
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_OPENROUTER_TIMEOUT_MS;
}

export async function callOpenRouter(
  messages: ChatMessage[],
): Promise<OpenRouterResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    getOpenRouterTimeoutMs(),
  );

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AgentSafe",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content: `You are AgentSafe, an intelligent crypto wallet assistant on Solana.
Your primary role is to help the user (who is the OWNER of the vault) initiate payments and manage their on-chain policy vault.
NOTE: The vault exclusively holds USDC.

CORE PRINCIPLES:
1. You DO NOT have custody of the funds. You only generate "payment requests" (intents) on behalf of the owner.
2. All actual transfers are governed by a secure on-chain Solana program that enforces the owner's policies (daily limits, per-transaction limits, recipient whitelists).
3. If a payment requires manual approval, remember that the user you are talking to IS the owner. Ask THEM to approve it (e.g., via a Solana Action/Blink), rather than saying you are waiting for some other owner to approve.

INSTRUCTIONS:
- When a user asks to pay someone, verify you have the recipient and the amount. If any information is missing, ask for clarification.
- Use the available tools to execute the payment request. 
- Be concise, professional, and focus on the safety and security of the transaction.
- Do not make up transaction signatures or fake balances. Only report what the tools return.
- Always respond in the same language that the user is writing in.
- Never output technical function names or JSON in the chat. Communicate with the user naturally.`,
            },
            ...messages,
          ],
          tools: chatTools,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return { choice: null, ok: false, status: response.status, errorBody };
    }

    const data = await response.json();
    return {
      choice: (data.choices?.[0] as OpenRouterChoice | undefined) ?? null,
      ok: true,
      status: 200,
      errorBody: "",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        choice: null,
        ok: false,
        status: 408,
        errorBody: "request timeout",
      };
    }

    return {
      choice: null,
      ok: false,
      status: 0,
      errorBody: error instanceof Error ? error.message : "network error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
