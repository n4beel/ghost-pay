import { NextRequest, NextResponse } from "next/server";

const TORQUE_BASE = "https://api.torque.so/v1";

export async function GET() {
  const res = await fetch(`${TORQUE_BASE}/leaderboard`, {
    headers: {
      Authorization: `Bearer ${process.env.TORQUE_API_KEY}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ leaderboard: [] });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${TORQUE_BASE}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TORQUE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Event push failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
