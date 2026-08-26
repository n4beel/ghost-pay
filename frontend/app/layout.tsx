import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import WalletProvider from "@/components/providers/WalletProvider";
import { ChainProvider } from "@/components/providers/ChainProvider";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { StealthProvider } from "@/components/providers/StealthProvider";
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

export const metadata: Metadata = {
  title: "Ghost Pay - Private Payments on Solana and BOT Chain",
  description:
    "Pay anyone, reveal nothing. Private payments on Solana with cryptographic privacy, and stealth address payments on BOT Chain.",
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
