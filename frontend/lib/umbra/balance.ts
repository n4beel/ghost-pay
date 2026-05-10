import { getEncryptedBalanceQuerierFunction, getNetworkEncryptionToSharedEncryptionConverterFunction } from "@umbra-privacy/sdk";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";
import { TOKENS } from "@/lib/tokens";

// Arcium re-encryption callback takes seconds to minutes.
// After conversion tx lands, status bits flip to "shared" immediately but the ciphertext
// is still MXE-encrypted. Decrypting it with the user's X25519 key produces garbage —
// a very large nonsense number. Any balance above this threshold is a garbage decrypt.
const MAX_SANE_BALANCE = BigInt(10 ** 18); // 10^12 tokens for 6-decimal, well above any real holding

export interface EncryptedTokenBalance {
  symbol: string;
  mint: string;
  balance: number;
  decimals: number;
  mxeMode?: boolean;
  callbackPending?: boolean; // conversion tx submitted, Arcium callback not yet received
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
    if (result?.state === "shared") {
      if (result.balance > 0n && result.balance <= MAX_SANE_BALANCE) {
        balances.push({
          symbol,
          mint: tokenInfo.mint,
          balance: Number(result.balance) / 10 ** tokenInfo.decimals,
          decimals: tokenInfo.decimals,
        });
      } else if (result.balance > MAX_SANE_BALANCE) {
        // Callback not yet received — ciphertext is still MXE-encrypted, decryption is garbage
        balances.push({
          symbol,
          mint: tokenInfo.mint,
          balance: 0,
          decimals: tokenInfo.decimals,
          callbackPending: true,
        });
      }
    } else if (result?.state === "mxe") {
      balances.push({
        symbol,
        mint: tokenInfo.mint,
        balance: 0,
        decimals: tokenInfo.decimals,
        mxeMode: true,
      });
    }
  }
  return balances;
}

export async function convertMxeBalancesToShared(client: UmbraClient): Promise<void> {
  const converter = getNetworkEncryptionToSharedEncryptionConverterFunction({ client });
  const mintAddresses = Object.values(TOKENS).map((t) => address(t.mint));
  await converter(mintAddresses);
}

export function formatBalance(balance: number, decimals: number): string {
  if (balance === 0) return "0.00";
  if (balance < 0.01) return "<0.01";
  return balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals <= 6 ? 2 : 4,
  });
}
