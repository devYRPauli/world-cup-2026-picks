"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DASHBOARD_TAG } from "@/lib/dashboard";
import { isKnockout } from "@/lib/groups";
import type { MatchRow, Pick } from "@/lib/types";

export type SaveResult = { ok: true } | { ok: false; error: string };

const validPicks = new Set<Pick>(["home", "draw", "away"]);

export async function savePredictionAction(formData: FormData): Promise<SaveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const matchId = getString(formData, "match_id");
  const pick = getString(formData, "pick") as Pick;

  if (!matchId || !validPicks.has(pick)) {
    return { ok: false, error: "Choose a winner before saving." };
  }

  const admin = getSupabaseAdminClient();
  const { data: match, error: matchError } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single<MatchRow>();

  if (matchError || !match) {
    return { ok: false, error: "Match not found." };
  }

  const locked = match.status !== "SCHEDULED" || new Date(match.starts_at).getTime() <= Date.now();
  if (locked) {
    return { ok: false, error: "That match is already locked." };
  }

  if (isKnockout(match) && pick === "draw") {
    return { ok: false, error: "Knockout matches can't end in a draw - pick a team." };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      match_id: matchId,
      user_id: user.id,
      pick,
      predicted_home_score: getOptionalInteger(formData, "predicted_home_score"),
      predicted_away_score: getOptionalInteger(formData, "predicted_away_score")
    },
    { onConflict: "match_id,user_id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTag(DASHBOARD_TAG);
  revalidatePath("/");
  return { ok: true };
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
