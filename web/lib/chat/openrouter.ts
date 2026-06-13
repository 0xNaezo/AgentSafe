import { chatTools } from "./tools";
import type { ChatMessage, OpenRouterChoice, OpenRouterResult } from "./types";

const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

export async function callOpenRouter(messages: ChatMessage[]): Promise<OpenRouterResult> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AgentSafe",
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, tools: chatTools }),
  });

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
}
