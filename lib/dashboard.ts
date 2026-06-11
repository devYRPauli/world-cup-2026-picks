import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGroups } from "@/lib/groups";
import type {
  GroupPredictionRow,
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
  const groupPredictionsResult = await supabase
    .from("group_predictions")
    .select("*")
    .returns<GroupPredictionRow[]>();
  const groupPredictions =
    groupPredictionsResult.error?.code === "42P01" ? [] : groupPredictionsResult.data ?? [];

  if (groupPredictionsResult.error && groupPredictionsResult.error.code !== "42P01") {
    throw new Error(groupPredictionsResult.error.message);
  }

  const userPredictions = predictions.filter((prediction) => prediction.user_id === currentUserId);
  const userPredictionsByMatch = new Map(
    userPredictions.map((prediction) => [prediction.match_id, prediction])
  );
  const userGroupPredictionsByGroup = new Map(
    groupPredictions
      .filter((prediction) => prediction.user_id === currentUserId)
      .map((prediction) => [prediction.group_name, prediction])
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

  const groups = buildGroups(matches);
  const leaderboard = buildLeaderboard(profiles, predictions, groupPredictions);
  const currentLeaderboardRow = leaderboard.find((row) => row.user_id === currentUserId) ?? null;
  const nextMatch = matches.find(
    (match) => match.status === "SCHEDULED" && new Date(match.starts_at).getTime() > Date.now()
  );

  return {
    matches,
    predictions,
    groupPredictions,
    profiles,
    groups,
    userPredictionsByMatch,
    userGroupPredictionsByGroup,
    statsByMatch,
    leaderboard,
    currentLeaderboardRow,
    nextMatch,
    groupPicksAvailable: !groupPredictionsResult.error
  };
}

function buildLeaderboard(
  profiles: ProfileRow[],
  predictions: PredictionRow[],
  groupPredictions: GroupPredictionRow[]
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>();

  for (const profile of profiles) {
    rows.set(profile.id, {
      user_id: profile.id,
      display_name: profile.display_name,
      avatar_color: profile.avatar_color,
      points: 0,
      match_points: 0,
      group_points: 0,
      correct: 0,
      picks: 0,
      exact_scores: 0,
      group_hits: 0,
      rank: 0
    });
  }

  for (const prediction of predictions) {
    const row = rows.get(prediction.user_id);
    if (!row) {
      continue;
    }

    row.match_points += prediction.points;
    row.picks += 1;

    if (prediction.is_correct) {
      row.correct += 1;
    }

    if (prediction.points === 5) {
      row.exact_scores += 1;
    }
  }

  for (const prediction of groupPredictions) {
    const row = rows.get(prediction.user_id);
    if (!row) {
      continue;
    }

    row.group_points += prediction.points;
    row.group_hits += prediction.points / 5;
  }

  for (const row of rows.values()) {
    row.points = row.match_points + row.group_points;
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
