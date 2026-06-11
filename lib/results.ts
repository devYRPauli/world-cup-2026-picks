import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { scorePrediction } from "@/lib/scoring";
import type { MatchRow, PredictionRow } from "@/lib/types";

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

