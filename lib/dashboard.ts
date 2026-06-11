import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  LeaderboardRow,
  MatchPredictionStats,
  MatchRow,
  PredictionRow,
  ProfileRow
} from "@/lib/types";

export async function getDashboardData(currentUserId: string) {
  const supabase = getSupabaseAdminClient();
  const [matchesResult, predictionsResult, profilesResult] = await Promise.all([
    supabase.from("matches").select("*").order("starts_at", { ascending: true }).returns<MatchRow[]>(),
    supabase.from("predictions").select("*").returns<PredictionRow[]>(),
    supabase.from("profiles").select("*").order("display_name", { ascending: true }).returns<ProfileRow[]>()
  ]);

  if (matchesResult.error) {
    throw new Error(matchesResult.error.message);
  }

  if (predictionsResult.error) {
    throw new Error(predictionsResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const matches = matchesResult.data ?? [];
  const predictions = predictionsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const userPredictions = predictions.filter((prediction) => prediction.user_id === currentUserId);
  const userPredictionsByMatch = new Map(
    userPredictions.map((prediction) => [prediction.match_id, prediction])
  );

  const statsByMatch = new Map<string, MatchPredictionStats>();
  for (const prediction of predictions) {
    const current = statsByMatch.get(prediction.match_id) ?? {
      total: 0,
      home: 0,
      draw: 0,
      away: 0
    };
    current.total += 1;
    current[prediction.pick] += 1;
    statsByMatch.set(prediction.match_id, current);
  }

  const leaderboard = buildLeaderboard(profiles, predictions);
  const currentLeaderboardRow = leaderboard.find((row) => row.user_id === currentUserId) ?? null;
  const nextMatch = matches.find(
    (match) => match.status === "SCHEDULED" && new Date(match.starts_at).getTime() > Date.now()
  );

  return {
    matches,
    predictions,
    profiles,
    userPredictionsByMatch,
    statsByMatch,
    leaderboard,
    currentLeaderboardRow,
    nextMatch
  };
}

function buildLeaderboard(profiles: ProfileRow[], predictions: PredictionRow[]): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>();

  for (const profile of profiles) {
    rows.set(profile.id, {
      user_id: profile.id,
      display_name: profile.display_name,
      avatar_color: profile.avatar_color,
      points: 0,
      correct: 0,
      picks: 0,
      exact_scores: 0,
      rank: 0
    });
  }

  for (const prediction of predictions) {
    const row = rows.get(prediction.user_id);
    if (!row) {
      continue;
    }

    row.points += prediction.points;
    row.picks += 1;

    if (prediction.is_correct) {
      row.correct += 1;
    }

    if (prediction.points === 5) {
      row.exact_scores += 1;
    }
  }

  return Array.from(rows.values())
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.correct !== a.correct) {
        return b.correct - a.correct;
      }

      return a.display_name.localeCompare(b.display_name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

