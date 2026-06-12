"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { buildGroups } from "@/lib/groups";
import { DASHBOARD_TAG } from "@/lib/dashboard";
import { getGroupLockOverride } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MatchRow } from "@/lib/types";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveGroupPredictionAction(formData: FormData): Promise<SaveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const groupName = getString(formData, "group_name");
  const pickedTeam1 = getString(formData, "picked_team_1");
  const pickedTeam2 = getString(formData, "picked_team_2");
  const pickedTeam3 = getString(formData, "picked_team_3");

  if (!groupName || !pickedTeam1 || !pickedTeam2) {
    return { ok: false, error: "Pick at least two teams before saving." };
  }

  const chosen = [pickedTeam1, pickedTeam2, ...(pickedTeam3 ? [pickedTeam3] : [])];
  if (new Set(chosen).size !== chosen.length) {
    return { ok: false, error: "Choose different teams." };
  }

  const admin = getSupabaseAdminClient();
  const { data: matches, error: matchesError } = await admin
    .from("matches")
    .select("*")
    .eq("group_name", groupName)
    .returns<MatchRow[]>();

  if (matchesError) {
    return { ok: false, error: matchesError.message };
  }

  const group = buildGroups(matches ?? []).find((item) => item.name === groupName);
  if (!group) {
    return { ok: false, error: "Group not found." };
  }

  if (group.is_locked) {
    return { ok: false, error: "That group is already locked." };
  }

  const teamNames = new Set(group.teams.map((team) => team.name));
  if (chosen.some((team) => !teamNames.has(team))) {
    return { ok: false, error: "Choose teams from that group." };
  }

  // The DB RLS check still keys off the group's earliest kickoff, so when an
  // admin has granted this group a temporary deadline extension we write with
  // the admin client. Every other group keeps writing under the member's RLS.
  // The lock itself is already validated above via group.is_locked.
  const overrideIso = getGroupLockOverride(groupName);
  const overrideActive = overrideIso ? new Date(overrideIso).getTime() > Date.now() : false;
  const writer = overrideActive ? admin : supabase;

  const { error } = await writer.from("group_predictions").upsert(
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
