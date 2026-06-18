export const CHAT_AUTH_MESSAGE_PREFIX = "AgentSafe Chat Auth";

export const CHAT_AUTH_MESSAGE_FIELDS = {
  owner: "Owner",
  tokenMint: "TokenMint",
  issuedAt: "IssuedAt",
} as const;

export const CHAT_AUTH_MESSAGE_LINE_COUNT = 4;

type ChatAuthMessageField =
  (typeof CHAT_AUTH_MESSAGE_FIELDS)[keyof typeof CHAT_AUTH_MESSAGE_FIELDS];

function formatChatAuthMessageField(
  field: ChatAuthMessageField,
  value: string | number,
) {
  return `${field}: ${value}`;
}

export function buildChatAuthMessage(
  owner: string,
  tokenMint: string,
  issuedAt: number,
) {
  return [
    CHAT_AUTH_MESSAGE_PREFIX,
    formatChatAuthMessageField(CHAT_AUTH_MESSAGE_FIELDS.owner, owner),
    formatChatAuthMessageField(CHAT_AUTH_MESSAGE_FIELDS.tokenMint, tokenMint),
    formatChatAuthMessageField(CHAT_AUTH_MESSAGE_FIELDS.issuedAt, issuedAt),
  ].join("\n");
}

export function readChatAuthMessageField(
  line: string,
  field: ChatAuthMessageField,
) {
  const prefix = `${field}: `;

  if (!line.startsWith(prefix)) {
    return null;
  }

  return line.slice(prefix.length);
}
