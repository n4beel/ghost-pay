import { NextRequest, NextResponse } from "next/server";

const MB_BASE = process.env.MAGICBLOCK_API_URL ?? "https://payments.magicblock.app";

async function proxy(request: NextRequest, path: string) {
  const url = `${MB_BASE}/${path}`;
  const body = request.method !== "GET" ? await request.text() : undefined;
  const authHeader = request.headers.get("authorization");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxy(request, route.join("/"));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  return proxy(request, route.join("/"));
}
