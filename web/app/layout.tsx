import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
