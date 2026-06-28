import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret } from "@/lib/env";
import { syncWorldCupMatches } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = getCronSecret();
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncWorldCupMatches();

  return NextResponse.json({
    ok: true,
    ...result
  });
}
