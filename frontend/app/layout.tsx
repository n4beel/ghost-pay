import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import WalletProvider from "@/components/providers/WalletProvider";
import { ChainProvider } from "@/components/providers/ChainProvider";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { StealthProvider } from "@/components/providers/StealthProvider";
import { BOTCHAIN_ENABLED } from "@/lib/botchain/gate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The title and description advertise BOT Chain only in builds where it exists.
 *
 * `NEXT_PUBLIC_*` is inlined at build time on the server too, so this resolves per deployment: a
 * production build with the flag off never claims a second chain a visitor cannot reach. Search
 * results and link previews outlive the deploy that produced them, which makes an overclaim here
 * more durable than one in the UI.
 */
export const metadata: Metadata = {
  title: BOTCHAIN_ENABLED
    ? "Ghost Pay - Private Payments on Solana and BOT Chain"
    : "Ghost Pay - Private Payments on Solana",
  description: BOTCHAIN_ENABLED
    ? "Pay anyone, reveal nothing. Private payments on Solana with cryptographic privacy, and stealth address payments on BOT Chain."
    : "Pay anyone, reveal nothing. Private payments on Solana with cryptographic privacy — amounts hidden, sender and receiver unlinkable.",
  icons: {
    icon: [
      { url: "/ghost-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ghost-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/ghost-128.png", sizes: "128x128", type: "image/png" },
  },
  openGraph: {
    title: "Ghost Pay",
    description: "Pay anyone, reveal nothing.",
    type: "website",
    images: [{ url: "/ghost-256.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ChainProvider>
          <EvmProvider>
            <StealthProvider>
              <WalletProvider>{children}</WalletProvider>
            </StealthProvider>
          </EvmProvider>
        </ChainProvider>
        <Analytics />
      </body>
    </html>
  );
}
