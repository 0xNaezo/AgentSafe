import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AppRoute = "/" | "/vault-setup" | "/agent-chat";

type AppShellProps = {
  activeHref: AppRoute;
  children: ReactNode;
  title: string;
};

const navItems: Array<{ href: AppRoute; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault-setup", label: "Vault setup", icon: SlidersHorizontal },
  { href: "/agent-chat", label: "Agent chat", icon: MessagesSquare },
];

export function AppShell({ activeHref, children, title }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b border-slate-200 pb-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">AgentSafe</p>
              <h1 className="text-xl font-semibold tracking-normal text-slate-950">
                {title}
              </h1>
            </div>
          </div>

          <nav
            aria-label="Primary"
            className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition ${
                    isActive
                      ? "border-slate-950 bg-white text-slate-950 ring-2 ring-slate-950/10"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 lg:justify-end">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800" type="button">
              <Wallet size={18} aria-hidden="true" />
              Connect wallet
            </button>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

export type IconComponent = LucideIcon;
