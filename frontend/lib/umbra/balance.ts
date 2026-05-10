import { getEncryptedBalanceQuerierFunction } from "@umbra-privacy/sdk";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";
import { TOKENS } from "@/lib/tokens";

export interface EncryptedTokenBalance {
  symbol: string;
  mint: string;
  balance: number;
  decimals: number;
}

export async function queryEncryptedBalances(
  client: UmbraClient,
): Promise<EncryptedTokenBalance[]> {
  const querier = getEncryptedBalanceQuerierFunction({ client });
  const mintAddresses = Object.values(TOKENS).map((t) => address(t.mint));
  const results = await querier(mintAddresses);

  const balances: EncryptedTokenBalance[] = [];
  for (const [symbol, tokenInfo] of Object.entries(TOKENS)) {
    const result = results.get(address(tokenInfo.mint));
    if (result?.state === "shared" && result.balance > 0n) {
      balances.push({
        symbol,
        mint: tokenInfo.mint,
        balance: Number(result.balance) / 10 ** tokenInfo.decimals,
        decimals: tokenInfo.decimals,
      });
    }
  }
  return balances;
}

export function formatBalance(balance: number, decimals: number): string {
  if (balance === 0) return "0.00";
  if (balance < 0.01) return "<0.01";
  return balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals <= 6 ? 2 : 4,
  });
}
