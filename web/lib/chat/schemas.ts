import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

function publicKeySchema(field: string) {
  return z.string().transform((value, ctx) => {
    try {
      return new PublicKey(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must be a valid public key`,
      });
      return z.NEVER;
    }
  });
}

export const chatRequestMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().nullable(),
});

export const chatRequestBodySchema = z.object({
  messages: z.unknown(),
  context: z.unknown(),
});

export const executionContextSchema = z.object({
  owner: publicKeySchema("owner"),
  tokenMint: publicKeySchema("tokenMint"),
});

export const executePaymentToolArgsSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "amount must be a positive decimal number"),
  address: publicKeySchema("address"),
});

export const toolCallArgsSchema = z.record(z.unknown());

export const toolResultSummarySchema = z.union([
  z.object({
    executed: z.literal(true),
    tool: z.literal("execute_payment"),
    recipient: z.string(),
    amount: z.string(),
    signature: z.string(),
  }),
  z.object({
    executed: z.literal(false),
    reason: z.string(),
  }),
]);
