import { NextRequest, NextResponse } from "next/server";

const DUNE_SIM_BASE = "https://api.sim.dune.com/v1";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  const headers = {
    "X-Sim-Api-Key": process.env.DUNE_SIM_API_KEY!,
  };

  const [balancesRes, activitiesRes] = await Promise.all([
    fetch(`${DUNE_SIM_BASE}/solana/balances/${wallet}`, { headers }),
    fetch(`${DUNE_SIM_BASE}/solana/activities/${wallet}?limit=20`, { headers }),
  ]);

  const [balances, activities] = await Promise.all([
    balancesRes.ok ? balancesRes.json() : { error: "Failed" },
    activitiesRes.ok ? activitiesRes.json() : { error: "Failed" },
  ]);

  return NextResponse.json({ balances, activities });
}
