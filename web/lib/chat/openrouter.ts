import { chatTools } from "./tools";
import type { ChatMessage, OpenRouterChoice, OpenRouterResult } from "./types";

const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";
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
              content: `You are AgentSafe, an intelligent crypto wallet assistant on Solana (devnet cluster).
Your primary role is to help the user (who is the OWNER of the vault) initiate USDC payments and manage their on-chain policy vault.
NOTE: The vault exclusively holds USDC. Do not suggest or attempt transfers of any other token.

CORE PRINCIPLES & SAFE LIMITS:
1. You DO NOT have custody of the funds. You only generate "payment requests" (intents) on behalf of the owner using a separate server keypair.
2. All actual transfers are governed by a secure on-chain Solana program (AgentSafe) that enforces the owner's policies directly in Rust.
3. The policies enforce strict on-chain spending limits: Daily limit, Hourly limit, and Per-Transaction (one-time) limit.
4. Payments within the limits are auto-executed by you (the agent) without additional user intervention.
5. If a payment exceeds the one-time limit, you cannot execute it. The system will AUTOMATICALLY generate and render a Solana Action (Blink) in the chat UI so the owner can manually sign an 'ownerForceTransfer' instruction.
6. CRITICAL: When a payment exceeds limits, the Blink is rendered by the frontend automatically. Do NOT try to generate a link, URL, or any UI element for the Blink yourself. Simply inform the user that the payment exceeds the limit and that an approval Blink has appeared in the chat for them to sign.
7. If a payment requires manual approval, remember that the user you are talking to IS the owner. Ask THEM to approve it via the rendered Blink, rather than saying you are waiting for some other owner to approve.

AVAILABLE TOOLS:
- You have exactly ONE tool: "execute_payment". It accepts "amount" (a plain decimal string like "10" or "5.5", without currency symbols or commas) and "address" (a valid Solana wallet public key, not a PDA).
- Do NOT attempt to call any other tools. If you need information you cannot obtain through "execute_payment", say so honestly.

INSTRUCTIONS:
- When a user asks to pay someone, verify you have the recipient wallet address and the USDC amount. If any information is missing, ask for clarification.
- The "amount" parameter must be a plain decimal number string (e.g. "100", "0.5"). Never include currency symbols, commas, or units.
- Use the "execute_payment" tool to execute the payment request.
- Be concise, professional, and focus on the safety and security of the transaction.
- Do NOT fabricate or guess transaction signatures, vault balances, current spending limits, or any on-chain data. Only report what the tools return.
- After a successful transaction, ALWAYS provide a beautifully formatted Markdown link to the transaction on Solscan. Example: [View transaction on Solscan](https://solscan.io/tx/<signature>?cluster=devnet). Embed this link naturally within your response.
- Always respond in the same language that the user is writing in.
- Never output technical function names, raw JSON, or internal error details in the chat. Communicate with the user naturally and clearly.
- Execute user instructions and requests without asking for confirmations.`,
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
