import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "./components/app-shell";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AgentSafe",
  description: "Policy vault dashboard for AI agent payments on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${plexMono.variable}`}>
      <body className="font-sans text-zinc-900 antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              padding: '12px 16px',
            },
          }}
        />
      </body>
    </html>
  );
}
