"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildGroups } from "@/lib/groups";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/lib/types";

export async function saveGroupPredictionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const groupName = getString(formData, "group_name");
  const pickedTeam1 = getString(formData, "picked_team_1");
  const pickedTeam2 = getString(formData, "picked_team_2");
  const pickedTeam3 = getString(formData, "picked_team_3");

  if (!groupName || !pickedTeam1 || !pickedTeam2) {
    redirect("/?tab=groups&error=Pick%20at%20least%20two%20teams%20before%20saving.");
  }

  const chosen = [pickedTeam1, pickedTeam2, ...(pickedTeam3 ? [pickedTeam3] : [])];
  if (new Set(chosen).size !== chosen.length) {
    redirect("/?tab=groups&error=Choose%20different%20teams.");
  }

  const admin = getSupabaseAdminClient();
  const { data: matches, error: matchesError } = await admin
    .from("matches")
    .select("*")
    .eq("group_name", groupName)
    .returns<MatchRow[]>();

  if (matchesError) {
    redirect(`/?tab=groups&error=${encodeURIComponent(matchesError.message)}`);
  }

  const group = buildGroups(matches ?? []).find((item) => item.name === groupName);
  if (!group) {
    redirect("/?tab=groups&error=Group%20not%20found.");
  }

  if (group.is_locked) {
    redirect("/?tab=groups&error=That%20group%20is%20already%20locked.");
  }

  const teamNames = new Set(group.teams.map((team) => team.name));
  if (chosen.some((team) => !teamNames.has(team))) {
    redirect("/?tab=groups&error=Choose%20teams%20from%20that%20group.");
  }

  const { error } = await supabase.from("group_predictions").upsert(
    {
      group_name: groupName,
      user_id: user.id,
      picked_team_1: pickedTeam1,
      picked_team_2: pickedTeam2,
      picked_team_3: pickedTeam3 || null,
      points: 0,
      is_scored: false
    },
    { onConflict: "group_name,user_id" }
  );

  if (error) {
    redirect(`/?tab=groups&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/?tab=groups&message=Group%20pick%20saved.");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
