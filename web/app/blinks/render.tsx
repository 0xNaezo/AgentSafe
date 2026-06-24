"use client";

import "@dialectlabs/blinks/index.css";

import {
  BaseBlinkLayout,
  Blink,
  BlockchainIds,
  createSignMessageText,
  useBlink,
  useBaseLayoutPropNormalizer,
  verifySignMessageData,
  type BaseBlinkLayoutProps,
  type BlinkProps,
  type SignMessageData,
} from "@dialectlabs/blinks";
import { BlinkSolanaConfig } from "@dialectlabs/blinks-core/solana";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useMemo } from "react";

import { RPC_URL } from "@/lib/solana/config";

type AgentSafeBlinkProps = {
  recipient: string;
  amount: string;
  tokenMint: string;
  className?: string;
};

export function AgentSafeBlink({
  amount,
  className,
  recipient,
  tokenMint,
}: AgentSafeBlinkProps) {
  const blinkApiUrl = useMemo(
    () => buildBlinkApiUrl(recipient, amount, tokenMint),
    [amount, recipient, tokenMint],
  );
  const adapter = useAgentSafeBlinkAdapter();
  const { blink, isLoading } = useBlink({ url: blinkApiUrl });

  if (isLoading) {
    return (
      <div className={className}>
        <BlinkShell>
          <div className="h-48 animate-pulse rounded-lg bg-zinc-100" />
        </BlinkShell>
      </div>
    );
  }

  if (!blink) {
    return (
      <div className={className}>
        <BlinkShell>
          <p className="text-sm font-medium text-rose-700">
            Unable to load approval Blink.
          </p>
        </BlinkShell>
      </div>
    );
  }

  return (
    <div className={className}>
      <BlinkShell>
        <Blink
          blink={blink}
          adapter={adapter}
          _Layout={QuietBlinkLayout}
          {...quietBlinkWarningsProps}
          securityLevel="all"
          stylePreset="x-light"
        />
      </BlinkShell>
    </div>
  );
}

const quietBlinkWarningsProps = {
  disableWarnings: true,
  hideUnregisteredWarning: true,
} as Pick<BlinkProps, never>;

function QuietBlinkLayout(props: BaseBlinkLayoutProps) {
  const normalizedProps = useBaseLayoutPropNormalizer(props);

  return <BaseBlinkLayout {...normalizedProps} disclaimer={null} />;
}

function BlinkShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="agentsafe-blink-shell w-full min-w-0 max-w-[560px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50  sm:min-w-[420px]">
      {children}
    </div>
  );
}

function buildBlinkApiUrl(recipient: string, amount: string, tokenMint: string) {
  const path = "/blinks";
  const searchParams = new URLSearchParams({
    to: recipient,
    amount,
    tokenMint,
  });

  if (typeof window === "undefined") {
    return `${path}?${searchParams.toString()}`;
  }

  return `${window.location.origin}${path}?${searchParams.toString()}`;
}

function useAgentSafeBlinkAdapter() {
  const wallet = useWallet();

  return useMemo(() => {
    const connection = new Connection(RPC_URL, "confirmed");

    return new BlinkSolanaConfig(connection, {
      metadata: {
        supportedBlockchainIds: [
          BlockchainIds.SOLANA_MAINNET,
          BlockchainIds.SOLANA_DEVNET,
        ],
      },
      connect: async () => {
        if (!wallet.wallet) {
          return null;
        }

        if (!wallet.connected) {
          await wallet.connect();
        }

        return wallet.publicKey?.toBase58() ?? null;
      },
      signTransaction: async (txData) => {
        if (!wallet.publicKey) {
          return { error: "Connect the owner wallet first." };
        }

        try {
          const tx = VersionedTransaction.deserialize(decodeBase64(txData));
          const signature = await wallet.sendTransaction(tx, connection);

          return { signature };
        } catch {
          return { error: "Signing failed." };
        }
      },
      signMessage: async (data) => {
        if (!wallet.signMessage || !wallet.publicKey) {
          return { error: "Signing failed." };
        }

        if (!isSignMessageDataValid(data, wallet.publicKey.toBase58())) {
          return { error: "Signing failed." };
        }

        try {
          const text =
            typeof data === "string" ? data : createSignMessageText(data);
          const encoded = new TextEncoder().encode(text);
          const signature = await wallet.signMessage(encoded);

          return { signature: bs58.encode(signature) };
        } catch {
          return { error: "Signing failed." };
        }
      },
    });
  }, [wallet]);
}

function decodeBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function isSignMessageDataValid(
  data: string | SignMessageData,
  expectedAddress: string,
) {
  if (typeof data === "string") {
    return true;
  }

  const errors = verifySignMessageData(data, { expectedAddress });

  if (errors.length > 0) {
    console.warn(
      `[@dialectlabs/blinks] Sign message data verification error: ${errors.join(
        ", ",
      )}`,
    );
  }

  return errors.length === 0;
}
