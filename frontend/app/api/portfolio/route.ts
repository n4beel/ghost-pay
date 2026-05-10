import { NextRequest, NextResponse } from "next/server";

const DUNE_SIM_BASE = "https://api.sim.dune.com/beta/svm";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  const headers = {
    "X-Sim-Api-Key": process.env.DUNE_SIM_API_KEY!,
  };

  const [balancesRes, activitiesRes] = await Promise.all([
    fetch(`${DUNE_SIM_BASE}/balances/${wallet}`, { headers }),
    fetch(`${DUNE_SIM_BASE}/transactions/${wallet}?limit=20`, { headers }),
  ]);

  const [balances, activities] = await Promise.all([
    balancesRes.ok ? balancesRes.json() : balancesRes.text().then((t) => {
      console.error("[portfolio] balances failed:", balancesRes.status, t.slice(0, 200));
      return { error: `${balancesRes.status} ${balancesRes.statusText}` };
    }),
    activitiesRes.ok ? activitiesRes.json() : activitiesRes.text().then((t) => {
      console.error("[portfolio] activities failed:", activitiesRes.status, t.slice(0, 200));
      return { error: `${activitiesRes.status} ${activitiesRes.statusText}` };
    }),
  ]);

  return NextResponse.json({ balances, activities });
}
