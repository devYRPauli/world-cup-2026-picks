"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatchRow, Pick } from "@/lib/types";

const validPicks = new Set<Pick>(["home", "draw", "away"]);

export async function savePredictionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const matchId = getString(formData, "match_id");
  const pick = getString(formData, "pick") as Pick;

  if (!matchId || !validPicks.has(pick)) {
    redirect("/?error=Choose%20a%20winner%20before%20saving.");
  }

  const admin = getSupabaseAdminClient();
  const { data: match, error: matchError } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single<MatchRow>();

  if (matchError || !match) {
    redirect("/?error=Match%20not%20found.");
  }

  const locked = match.status !== "SCHEDULED" || new Date(match.starts_at).getTime() <= Date.now();
  if (locked) {
    redirect("/?error=That%20match%20is%20already%20locked.");
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
    redirect(`/?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/?message=Pick%20saved.");
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

