"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AppRoute = "/" | "/vault-settings" | "/agent-chat" | "/vault-metadata";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: AppRoute;
  label: string;
  pageTitle: string;
  icon: LucideIcon;
};

const mainNavItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    pageTitle: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/vault-settings",
    label: "Vault Settings",
    pageTitle: "VaultSettings",
    icon: SlidersHorizontal,
  },
  {
    href: "/agent-chat",
    label: "Chat",
    pageTitle: "Chat",
    icon: MessagesSquare,
  },
];

const bottomNavItems: NavItem[] = [
  {
    href: "/vault-metadata",
    label: "Vault Metadata",
    pageTitle: "VaultMetadataPage",
    icon: ClipboardList,
  },
];

const allNavItems = [...mainNavItems, ...bottomNavItems];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const activeItem =
    allNavItems.find((item) => item.href === activeHref) ?? allNavItems[0];

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950">
      {/* Sidebar */}
      <aside className="app-sidebar fixed left-0 top-0 z-30 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <span className="text-[0.9375rem] font-bold text-zinc-950">
            AgentSafe
          </span>
        </div>

        {/* Main navigation */}
        <nav aria-label="Primary" className="mt-2 flex flex-1 flex-col px-3">
          <div className="space-y-0.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive}
                  className="app-sidebar-nav-item"
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Bottom items */}
          <div className="mt-auto border-t border-zinc-100 pb-4 pt-3">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive}
                  className="app-sidebar-nav-item"
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main content area */}
      <div
        className="flex min-h-screen flex-1 flex-col"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >


        {/* Page content */}
        <main className="flex flex-1 flex-col px-8 py-6">{children}</main>
      </div>
    </div>
  );
}

function getActiveHref(pathname: string): AppRoute {
  if (pathname.startsWith("/vault-settings") || pathname.startsWith("/vault-setup")) {
    return "/vault-settings";
  }

  if (pathname.startsWith("/vault-metadata")) {
    return "/vault-metadata";
  }

  if (pathname.startsWith("/agent-chat")) {
    return "/agent-chat";
  }

  return "/";
}

export type IconComponent = LucideIcon;
