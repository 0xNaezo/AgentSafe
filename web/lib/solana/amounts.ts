import BN from "bn.js";

export function parseTokenAmount(value: string, decimals: number) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Amount is required.");
  }

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Amount must be a positive decimal number.");
  }

  const [whole, fraction = ""] = trimmed.split(".");

  if (fraction.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places.`);
  }

  const units = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+/, "");
  return new BN(units || "0", 10);
}

export function formatTokenAmount(amount: BN | string | number, decimals: number) {
  const raw = amount.toString();

  if (decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}
