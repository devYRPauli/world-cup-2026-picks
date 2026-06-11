import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_TAG } from "@/lib/dashboard";
import { syncWorldCupMatches } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncWorldCupMatches();
  revalidateTag(DASHBOARD_TAG);

  return NextResponse.json({
    ok: true,
    ...result
  });
}
