import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdvancedTeams, scoreAdvancers } from "@/lib/groups";
import { scorePrediction } from "@/lib/scoring";
import type { GroupPredictionRow, MatchRow, PredictionRow } from "@/lib/types";

const ROUND_OF_32_SIZE = 32;

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

export async function recalculateGroupPredictions() {
  const supabase = getSupabaseAdminClient();
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true })
    .returns<MatchRow[]>();

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const advanced = new Set(getAdvancedTeams(matches ?? []));
  const bracketResolved = advanced.size >= ROUND_OF_32_SIZE;

  const { data: predictions, error: predictionsError } = await supabase
    .from("group_predictions")
    .select("*")
    .returns<GroupPredictionRow[]>();

  if (predictionsError) {
    if (predictionsError.code === "42P01") {
      return 0;
    }

    throw new Error(predictionsError.message);
  }

  let touched = 0;

  for (const prediction of predictions ?? []) {
    const picks = [
      prediction.picked_team_1,
      prediction.picked_team_2,
      prediction.picked_team_3
    ].filter((team): team is string => Boolean(team));

    const { error } = await supabase
      .from("group_predictions")
      .update({
        points: scoreAdvancers(picks, advanced),
        is_scored: bracketResolved
      })
      .eq("id", prediction.id);

    if (error) {
      throw new Error(error.message);
    }

    touched += 1;
  }

  return touched;
}
