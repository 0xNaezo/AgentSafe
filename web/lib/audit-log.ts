export type AuditLogEntry = {
  id: string;
  createdAt: number;
  source: "agent_chat" | "dashboard";
  event:
    | "Auto-payment executed"
    | "Manual approval required"
    | "Payment blocked"
    | "Deposit confirmed"
    | "Withdraw confirmed";
  status: "Passed" | "Pending" | "Blocked";
  owner: string;
  tokenMint: string;
  recipient?: string;
  amount?: string;
  signature?: string;
  reason?: string;
  agentPubkey?: string;
  tool?: "execute_payment";
  approvalType?: "owner_force_transfer";
  vaultState?: string;
  vaultTokenAccount?: string;
};

export const AUDIT_LOG_LIMIT = 100;
const STORAGE_KEY_PREFIX = "agentsafe:audit-log";

function getAuditLogStorageKey(owner: string, tokenMint: string) {
  return `${STORAGE_KEY_PREFIX}:${owner}:${tokenMint}`;
}

function isAuditLogEntry(value: unknown): value is AuditLogEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<AuditLogEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "number" &&
    (entry.source === "agent_chat" || entry.source === "dashboard") &&
    typeof entry.event === "string" &&
    (entry.status === "Passed" ||
      entry.status === "Pending" ||
      entry.status === "Blocked") &&
    typeof entry.owner === "string" &&
    typeof entry.tokenMint === "string"
  );
}

export function createAuditLogEntryId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readAuditLog(owner: string, tokenMint: string): AuditLogEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getAuditLogStorageKey(owner, tokenMint));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isAuditLogEntry)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, AUDIT_LOG_LIMIT);
  } catch {
    return [];
  }
}

export function writeAuditLog(entries: AuditLogEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (entries.length === 0) {
    return;
  }

  const [{ owner, tokenMint }] = entries;
  const normalized = entries
    .filter((entry) => entry.owner === owner && entry.tokenMint === tokenMint)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, AUDIT_LOG_LIMIT);

  try {
    window.localStorage.setItem(
      getAuditLogStorageKey(owner, tokenMint),
      JSON.stringify(normalized),
    );
  } catch {
    // Browser storage can be unavailable in private mode or full quota states.
  }
}

export function appendAuditLog(entry: AuditLogEntry): AuditLogEntry[] {
  const entries = [entry, ...readAuditLog(entry.owner, entry.tokenMint)].slice(
    0,
    AUDIT_LOG_LIMIT,
  );

  writeAuditLog(entries);
  return entries;
}

export function appendAuditLogEntries(entries: AuditLogEntry[]) {
  if (entries.length === 0) {
    return [];
  }

  const [{ owner, tokenMint }] = entries;
  const scopedEntries = entries.filter(
    (entry) => entry.owner === owner && entry.tokenMint === tokenMint,
  );
  const nextEntries = [
    ...scopedEntries.sort((left, right) => right.createdAt - left.createdAt),
    ...readAuditLog(owner, tokenMint),
  ].slice(0, AUDIT_LOG_LIMIT);

  writeAuditLog(nextEntries);
  return nextEntries;
}
