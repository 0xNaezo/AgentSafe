"use client";

import type { Adapter } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  UnsafeBurnerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { RPC_URL } from "../lib/solana/config";

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => {
    const configuredWallets: Adapter[] = [new PhantomWalletAdapter()];

    if (process.env.NEXT_PUBLIC_ENABLE_BURNER_WALLET === "true") {
      configuredWallets.push(new UnsafeBurnerWalletAdapter());
    }

    return configuredWallets;
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
