import { NextRequest, NextResponse } from "next/server";
import { GoldRushClient } from "@covalenthq/client-sdk";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  const client = new GoldRushClient(process.env.COVALENT_API_KEY!);
  const { data, error } = await client.BalanceService.getTokenBalancesForWalletAddress(
    "solana-mainnet",
    wallet,
  );

  if (error) {
    return NextResponse.json({ error: "Covalent fetch failed" }, { status: 502 });
  }

  // GoldRush SDK uses BigInt internally — serialize via replacer before JSON encoding
  const safe = JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
  return NextResponse.json({ data: safe });
}
