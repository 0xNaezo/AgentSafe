"use client";

import { Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { useState } from "react";
import { useHasMounted } from "../hooks/use-has-mounted";

export function WalletConnect() {
  const {
    connect,
    connected,
    connecting,
    disconnect,
    publicKey,
    select,
    wallet,
    wallets,
  } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const hasMounted = useHasMounted();
  const isConnected = hasMounted && connected;
  const isConnecting = hasMounted && connecting;
  const activeLabel = !hasMounted
    ? "Connect wallet"
    : publicKey
    ? shortAddress(publicKey.toBase58())
    : wallet
      ? `Connect ${wallet.adapter.name}`
      : "Connect wallet";

  async function handleConnect() {
    if (!wallet) {
      setIsOpen((current) => !current);
      return;
    }

    await connect();
  }

  return (
    <div className="wallet-button-shell relative">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        type="button"
        onClick={isConnected ? () => setIsOpen((current) => !current) : handleConnect}
      >
        <Wallet size={18} aria-hidden="true" />
        {isConnecting ? "Connecting..." : activeLabel}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-20 grid min-w-56 gap-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-950 shadow-lg">
          {isConnected ? (
            <button
              className="rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              type="button"
              onClick={async () => {
                await disconnect();
                setIsOpen(false);
              }}
            >
              Disconnect
            </button>
          ) : (
            wallets.map((walletOption) => (
              <button
                className="rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={walletOption.readyState === "Unsupported"}
                key={walletOption.adapter.name}
                type="button"
                onClick={async () => {
                  select(walletOption.adapter.name as WalletName);
                  setIsOpen(false);
                }}
              >
                {walletOption.adapter.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
