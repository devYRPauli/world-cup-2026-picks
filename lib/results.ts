import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGroups, getGroupTopTwo, scoreGroupPrediction } from "@/lib/groups";
import { scorePrediction } from "@/lib/scoring";
import type { GroupPredictionRow, MatchRow, PredictionRow } from "@/lib/types";

export async function recalculateMatchPredictions(matchId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single<MatchRow>();

  if (matchError) {
    throw new Error(matchError.message);
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("*")
    .eq("match_id", matchId)
    .returns<PredictionRow[]>();

  if (predictionsError) {
    throw new Error(predictionsError.message);
  }

  await Promise.all(
    (predictions ?? []).map((prediction) => {
      const score = scorePrediction(prediction, match);

      return supabase
        .from("predictions")
        .update({
          points: score.points,
          is_correct: score.isCorrect
        })
        .eq("id", prediction.id);
    })
  );

  return predictions?.length ?? 0;
}

export async function recalculateManyMatches(matchIds: string[]) {
  let touched = 0;

  for (const matchId of matchIds) {
    touched += await recalculateMatchPredictions(matchId);
  }

  return touched;
}

export async function recalculateGroupPredictions(groupNames?: string[]) {
  const supabase = getSupabaseAdminClient();
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true })
    .returns<MatchRow[]>();

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const groups = buildGroups(matches ?? []).filter(
    (group) => !groupNames || groupNames.includes(group.name)
  );

  if (!groups.length) {
    return 0;
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("group_predictions")
    .select("*")
    .in(
      "group_name",
      groups.map((group) => group.name)
    )
    .returns<GroupPredictionRow[]>();

  if (predictionsError) {
    if (predictionsError.code === "42P01") {
      return 0;
    }

    throw new Error(predictionsError.message);
  }

  let touched = 0;

  for (const group of groups) {
    const topTwo = getGroupTopTwo(group);
    const groupPredictions = (predictions ?? []).filter(
      (prediction) => prediction.group_name === group.name
    );

    for (const prediction of groupPredictions) {
      const points = group.is_complete
        ? scoreGroupPrediction([prediction.picked_team_1, prediction.picked_team_2], topTwo)
        : 0;

      const { error } = await supabase
        .from("group_predictions")
        .update({
          points,
          is_scored: group.is_complete
        })
        .eq("id", prediction.id);

      if (error) {
        throw new Error(error.message);
      }

      touched += 1;
    }
  }

  return touched;
}
