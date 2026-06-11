"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentProfile } from "@/lib/auth";
import { DASHBOARD_TAG } from "@/lib/dashboard";
import { syncWorldCupMatches } from "@/lib/football-data";
import { recalculateGroupPredictions, recalculateMatchPredictions } from "@/lib/results";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus, Pick } from "@/lib/types";

const validStatuses = new Set<MatchStatus>(["SCHEDULED", "LIVE", "FINISHED", "POSTPONED"]);
const validWinners = new Set<Pick>(["home", "draw", "away"]);

export async function syncMatchesAction() {
  await requireAdmin();

  let result;
  try {
    result = await syncWorldCupMatches();
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(getErrorMessage(error))}`);
  }

  revalidateTag(DASHBOARD_TAG);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(
    `/admin?message=${encodeURIComponent(
      `Synced ${result.imported} matches; recalculated ${result.recalculated} match picks and ${result.groupRecalculated} group picks.`
    )}`
  );
}

export async function updateMatchResultAction(formData: FormData) {
  await requireAdmin();

  const matchId = getString(formData, "match_id");
  const status = getString(formData, "status") as MatchStatus;
  const homeScore = getOptionalInteger(formData, "home_score");
  const awayScore = getOptionalInteger(formData, "away_score");
  const winnerValue = getString(formData, "result_winner") as Pick | "";
  const resultWinner = winnerValue && validWinners.has(winnerValue) ? winnerValue : inferWinner(homeScore, awayScore);

  if (!matchId || !validStatuses.has(status)) {
    redirect("/admin?error=Invalid%20match%20update.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status,
      home_score: homeScore,
      away_score: awayScore,
      result_winner: resultWinner
    })
    .eq("id", matchId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  await recalculateMatchPredictions(matchId);
  await recalculateGroupPredictions();

  revalidateTag(DASHBOARD_TAG);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?message=Result%20updated.");
}

async function requireAdmin() {
  const session = await requireCurrentProfile();

  if (!session.profile || session.profile.role !== "admin") {
    redirect("/");
  }
}

function inferWinner(homeScore: number | null, awayScore: number | null): Pick | null {
  if (homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return "home";
  }

  if (awayScore > homeScore) {
    return "away";
  }

  return "draw";
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalInteger(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
