export const TOKENS = {
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    symbol: "USDT",
    name: "Tether USD",
  },
  wSOL: {
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    symbol: "wSOL",
    name: "Wrapped SOL",
  },
  PUSD: {
    mint: process.env.NEXT_PUBLIC_PUSD_MINT ?? "CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s",
    decimals: 6,
    symbol: "PUSD",
    name: "Palm USD",
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

export function getToken(symbol: TokenSymbol) {
  return TOKENS[symbol];
}

export function getMintBySymbol(symbol: TokenSymbol): string {
  return TOKENS[symbol].mint;
}

export function getSymbolByMint(mint: string): TokenSymbol | undefined {
  return (Object.entries(TOKENS) as [TokenSymbol, (typeof TOKENS)[TokenSymbol]][]).find(
    ([, t]) => t.mint === mint,
  )?.[0];
}

export const SUPPORTED_TOKENS: TokenSymbol[] = ["USDC", "USDT", "wSOL", "PUSD"];
