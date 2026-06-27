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
          messages,
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
