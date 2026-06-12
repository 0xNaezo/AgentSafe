"use client";

import { Wallet as WalletIcon } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import type { PublicKey } from "@solana/web3.js";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMounted = useHasMounted();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const toggleButtonId = useId();
  const isConnected = hasMounted && connected;
  const isConnecting = hasMounted && connecting;
  const activeLabel = getActiveLabel(hasMounted, publicKey, wallet);
  const actionableIndexes = useMemo(() => {
    if (isConnected) {
      return [0];
    }

    return wallets.flatMap((walletOption, index) =>
      walletOption.readyState === "Unsupported" ? [] : [index],
    );
  }, [isConnected, wallets]);
  const firstActionableIndex = actionableIndexes[0] ?? 0;
  const opensMenu = !hasMounted || isConnected || !wallet;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      menuItemRefs.current[activeIndex]?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);

    return () => document.removeEventListener("click", handleDocumentClick);
  }, [isOpen]);

  async function handleConnect() {
    if (!wallet) {
      toggleMenu();
      return;
    }

    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet.", error);
    }
  }

  function toggleMenu() {
    const nextIsOpen = !isOpen;

    if (nextIsOpen) {
      setActiveIndex(firstActionableIndex);
    }

    setIsOpen(nextIsOpen);
  }

  async function handleDisconnect() {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet.", error);
    } finally {
      setIsOpen(false);
    }
  }

  function handleSelectWallet(walletName: WalletName) {
    try {
      select(walletName);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to select wallet.", error);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (actionableIndexes.length === 0) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      const activePosition = actionableIndexes.indexOf(activeIndex);
      const currentPosition = activePosition === -1 ? 0 : activePosition;
      const offset = event.key === "ArrowDown" ? 1 : -1;
      const nextPosition =
        (currentPosition + offset + actionableIndexes.length) % actionableIndexes.length;
      const nextIndex = actionableIndexes[nextPosition];

      setActiveIndex(nextIndex);
      menuItemRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      menuItemRefs.current[activeIndex]?.click();
    }
  }

  return (
    <div className="wallet-button-shell relative">
      <button
        aria-controls={isOpen ? `${toggleButtonId}-menu` : undefined}
        aria-expanded={isOpen}
        aria-haspopup={opensMenu ? "menu" : undefined}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        id={toggleButtonId}
        type="button"
        onClick={isConnected ? toggleMenu : handleConnect}
      >
        <WalletIcon size={18} aria-hidden="true" />
        {isConnecting ? "Connecting..." : activeLabel}
      </button>

      {isOpen && (
        <div
          aria-labelledby={toggleButtonId}
          className="absolute right-0 top-12 z-20 grid min-w-56 gap-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-950 shadow-lg"
          id={`${toggleButtonId}-menu`}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          {isConnected ? (
            <button
              className="rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              ref={(element) => {
                menuItemRefs.current[0] = element;
              }}
              role="menuitem"
              tabIndex={activeIndex === 0 ? 0 : -1}
              type="button"
              onClick={() => void handleDisconnect()}
              onFocus={() => setActiveIndex(0)}
            >
              Disconnect
            </button>
          ) : (
            wallets.map((walletOption, index) => {
              const isUnsupported = walletOption.readyState === "Unsupported";

              return (
                <button
                  aria-disabled={isUnsupported}
                  className="rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isUnsupported}
                  key={walletOption.adapter.name}
                  ref={(element) => {
                    menuItemRefs.current[index] = element;
                  }}
                  role="menuitem"
                  tabIndex={activeIndex === index && !isUnsupported ? 0 : -1}
                  type="button"
                  onClick={() => handleSelectWallet(walletOption.adapter.name as WalletName)}
                  onFocus={() => {
                    if (!isUnsupported) {
                      setActiveIndex(index);
                    }
                  }}
                >
                  {walletOption.adapter.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function getActiveLabel(
  hasMounted: boolean,
  publicKey: PublicKey | null,
  wallet: { adapter: { name: string } } | null,
) {
  if (!hasMounted) {
    return "Connect wallet";
  }

  if (publicKey) {
    return shortAddress(publicKey.toBase58());
  }

  if (wallet) {
    return `Connect ${wallet.adapter.name}`;
  }

  return "Connect wallet";
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
