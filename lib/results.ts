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

const RECALC_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}

export async function recalculateManyMatches(matchIds: string[]) {
  const counts = await mapWithConcurrency(matchIds, RECALC_CONCURRENCY, (matchId) =>
    recalculateMatchPredictions(matchId)
  );

  return counts.reduce((sum, count) => sum + count, 0);
}

export async function recalculateGroupPredictions(preloadedMatches?: MatchRow[]) {
  const supabase = getSupabaseAdminClient();

  let matches = preloadedMatches;
  if (!matches) {
    const { data, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .order("starts_at", { ascending: true })
      .returns<MatchRow[]>();

    if (matchesError) {
      throw new Error(matchesError.message);
    }

    matches = data ?? [];
  }

  const advanced = new Set(getAdvancedTeams(matches));
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

  // Only write rows whose stored values actually change, so a steady-state sync
  // (no new advancers) issues zero updates instead of rewriting every row.
  const pending = (predictions ?? [])
    .map((prediction) => {
      const picks = [
        prediction.picked_team_1,
        prediction.picked_team_2,
        prediction.picked_team_3
      ].filter((team): team is string => Boolean(team));

      return { prediction, points: scoreAdvancers(picks, advanced) };
    })
    .filter(
      ({ prediction, points }) =>
        prediction.points !== points || prediction.is_scored !== bracketResolved
    );

  await mapWithConcurrency(pending, RECALC_CONCURRENCY, async ({ prediction, points }) => {
    const { error } = await supabase
      .from("group_predictions")
      .update({ points, is_scored: bracketResolved })
      .eq("id", prediction.id);

    if (error) {
      throw new Error(error.message);
    }
  });

  return pending.length;
}
