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

const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000; // ~5 MB base64

const textContentPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const imageContentPartSchema = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z
      .string()
      .max(MAX_IMAGE_DATA_URL_LENGTH, "Image data URL is too large"),
  }),
});

const contentPartSchema = z.discriminatedUnion("type", [
  textContentPartSchema,
  imageContentPartSchema,
]);

export const chatRequestMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string().nullable(), z.array(contentPartSchema)]),
});

export const chatRequestBodySchema = z.object({
  messages: z.unknown(),
  context: z.unknown(),
  auth: z.unknown(),
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
    requiresOwnerApproval: z.literal(true),
    approvalType: z.literal("owner_force_transfer"),
    reason: z.literal("onetime_limit_exceeded"),
    recipient: z.string(),
    amount: z.string(),
    tokenMint: z.string(),
  }),
  z.object({
    executed: z.literal(false),
    reason: z.string(),
  }),
]);

export const authSchema = z.object({
  signature: z.string().min(1).max(256),
  signedMessage: z.string().min(1).max(512),
  issuedAt: z.number().int().safe().nonnegative(),
});
