import { NextResponse } from "next/server";

const tools = [
  {
    type: "function" as const,
    function: {
      name: "transfer",
      description: "Transfer USDC to a recipient",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "string",
            description: "Amount of USDC to transfer",
          },
          address: {
            type: "string",
            description: "Recipient wallet address",
          },
        },
        required: ["amount", "address"],
      },
    },
  },
];

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

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
          model: "deepseek/deepseek-v4-flash",
          messages: [{ role: "user", content: message }],
          tools,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter error:", response.status, errorBody);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const reply = choice?.message?.content ?? "";
    let toolCall = null;

    if (choice?.finish_reason === "tool_calls") {
      const tc = choice.message?.tool_calls?.[0];
      if (tc?.type === "function") {
        toolCall = {
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
        };
      }
    }

    return NextResponse.json({ reply, toolCall });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
