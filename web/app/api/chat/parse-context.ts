import { executionContextSchema } from "@/lib/chat/schemas";
import type { ChatExecutionContext } from "@/lib/chat/types";

export type ParseExecutionContextResult =
  | { ok: true; context: ChatExecutionContext }
  | { ok: false; error: string; status: number };

export function parseExecutionContext(
  context: unknown,
): ParseExecutionContextResult {
  const parsedContext = executionContextSchema.safeParse(context);

  if (!parsedContext.success) {
    const issue = parsedContext.error.issues[0];

    if (issue?.path[0] === "owner" || issue?.path[0] === "tokenMint") {
      const field = issue.path[0];
      const error =
        issue.code === "invalid_type"
          ? `${field} must be a string`
          : issue.message;

      return { ok: false, error, status: 400 };
    }

    return { ok: false, error: "Invalid context", status: 400 };
  }

  return {
    ok: true,
    context: parsedContext.data,
  };
}
