import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGroups, getAdvancedTeams } from "@/lib/groups";
import type {
  GroupPredictionRow,
  GroupView,
  LeaderboardRow,
  MatchPredictionStats,
  MatchRow,
  PredictionRow,
  ProfileRow
} from "@/lib/types";

// Bust this with revalidateTag(DASHBOARD_TAG) whenever picks or results change.
export const DASHBOARD_TAG = "dashboard";

type GlobalDashboard = {
  matches: MatchRow[];
  predictions: PredictionRow[];
  groupPredictions: GroupPredictionRow[];
  groups: GroupView[];
  leaderboard: LeaderboardRow[];
  statsByMatch: Record<string, MatchPredictionStats>;
  advancedTeams: string[];
  nextMatch: MatchRow | null;
  groupPicksAvailable: boolean;
};

// The expensive part of the dashboard is identical for every user: four table
// reads plus the leaderboard / standings / pool-split aggregation. Cache it once
// (shared across users, revalidated on any write) and only slice per-user data
// per request.
const loadGlobalDashboard = unstable_cache(
  async (): Promise<GlobalDashboard> => {
    const supabase = getSupabaseAdminClient();
    const [matchesResult, predictionsResult, profilesResult, groupPredictionsResult] = await Promise.all([
      supabase.from("matches").select("*").order("starts_at", { ascending: true }).returns<MatchRow[]>(),
      supabase.from("predictions").select("*").returns<PredictionRow[]>(),
      supabase.from("profiles").select("*").order("display_name", { ascending: true }).returns<ProfileRow[]>(),
      supabase.from("group_predictions").select("*").returns<GroupPredictionRow[]>()
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

    const groupPredictionsMissing = groupPredictionsResult.error?.code === "42P01";
    if (groupPredictionsResult.error && !groupPredictionsMissing) {
      throw new Error(groupPredictionsResult.error.message);
    }

    const matches = matchesResult.data ?? [];
    const predictions = predictionsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const groupPredictions = groupPredictionsMissing ? [] : groupPredictionsResult.data ?? [];

    // Plain object (not a Map) so unstable_cache can serialize it.
    const statsByMatch: Record<string, MatchPredictionStats> = {};
    for (const prediction of predictions) {
      const current = statsByMatch[prediction.match_id] ?? { total: 0, home: 0, draw: 0, away: 0 };
      current.total += 1;
      current[prediction.pick] += 1;
      statsByMatch[prediction.match_id] = current;
    }

    const nextMatch =
      matches.find(
        (match) => match.status === "SCHEDULED" && new Date(match.starts_at).getTime() > Date.now()
      ) ?? null;

    return {
      matches,
      predictions,
      groupPredictions,
      groups: buildGroups(matches),
      leaderboard: buildLeaderboard(profiles, predictions, groupPredictions),
      statsByMatch,
      advancedTeams: getAdvancedTeams(matches),
      nextMatch,
      groupPicksAvailable: !groupPredictionsMissing
    };
  },
  ["dashboard-global-v1"],
  { tags: [DASHBOARD_TAG], revalidate: 60 }
);

export async function getDashboardData(currentUserId: string) {
  const global = await loadGlobalDashboard();

  const userPredictionsByMatch = new Map(
    global.predictions
      .filter((prediction) => prediction.user_id === currentUserId)
      .map((prediction) => [prediction.match_id, prediction])
  );
  const userGroupPredictionsByGroup = new Map(
    global.groupPredictions
      .filter((prediction) => prediction.user_id === currentUserId)
      .map((prediction) => [prediction.group_name, prediction])
  );
  const statsByMatch = new Map(Object.entries(global.statsByMatch));
  const currentLeaderboardRow = global.leaderboard.find((row) => row.user_id === currentUserId) ?? null;

  return {
    matches: global.matches,
    groups: global.groups,
    advancedTeams: global.advancedTeams,
    userPredictionsByMatch,
    userGroupPredictionsByGroup,
    statsByMatch,
    leaderboard: global.leaderboard,
    currentLeaderboardRow,
    nextMatch: global.nextMatch,
    groupPicksAvailable: global.groupPicksAvailable
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
