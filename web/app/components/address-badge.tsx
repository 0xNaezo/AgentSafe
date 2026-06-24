"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

type AddressBadgeProps = {
  address: string;
  label?: string;
  truncateChars?: number;
  showCopy?: boolean;
  showExternalLink?: boolean;
  explorerUrl?: string;
  mono?: boolean;
  className?: string;
};

export function AddressBadge({
  address,
  label,
  truncateChars = 4,
  showCopy = true,
  showExternalLink = false,
  explorerUrl,
  mono = true,
  className = "",
}: AddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const truncated = truncateAddress(address, truncateChars);
  const identiconGradient = generateIdenticonGradient(address);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        className="identicon"
        style={{ background: identiconGradient }}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-zinc-500">{label}</span>
      )}
      <span
        className={`text-sm font-medium text-zinc-900 ${mono ? "font-mono" : ""}`}
      >
        {truncated}
      </span>
      {showCopy && (
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          onClick={() => void copyAddress()}
          aria-label={copied ? "Copied" : "Copy address"}
          title={copied ? "Copied" : "Copy address"}
        >
          {copied ? (
            <Check size={13} aria-hidden="true" />
          ) : (
            <Copy size={13} aria-hidden="true" />
          )}
        </button>
      )}
      {showExternalLink && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="View on explorer"
        >
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </span>
  );
}

function truncateAddress(address: string, chars: number) {
  if (address.length <= chars * 2 + 3) {
    return address;
  }

  return `${address.slice(0, chars)} ··· ${address.slice(-chars)}`;
}

function generateIdenticonGradient(address: string) {
  let hash = 0;

  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 80)) % 360;
  const angle = Math.abs((hash >> 16) % 360);

  return `linear-gradient(${angle}deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 65%, 50%))`;
}

export { generateIdenticonGradient, truncateAddress };
