import { NextRequest, NextResponse } from "next/server";

const TORQUE_INGEST = "https://ingest.torque.so";
const TORQUE_SERVER = "https://server.torque.so";
const PROJECT_ID = "cmozo5pxf0266k01hc7zscq54";
const OFFER_ID = "cmp0upf32031kk01hxee3x927";

export async function GET() {
  const res = await fetch(
    `${TORQUE_SERVER}/project/${PROJECT_ID}/recurring-offer/${OFFER_ID}/latest-eval-results?limit=200`,
    { headers: { "x-api-key": process.env.TORQUE_API_KEY ?? "" } },
  );

  if (!res.ok) {
    return NextResponse.json({ leaderboard: [] });
  }

  const data = await res.json();

  // Map eval-results entries → leaderboard shape the rewards page expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = Array.isArray(data.data) ? data.data : (Array.isArray(data.results) ? data.results : []);
  const leaderboard = entries.map((e, i) => ({
    rank: e.rank ?? i + 1,
    address: e.pubkey ?? e.address ?? e.wallet ?? "",
    count: e.count ?? e.score ?? e.amount ?? 0,
  }));

  return NextResponse.json({ leaderboard });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${TORQUE_INGEST}/events`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.TORQUE_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Event push failed" }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
