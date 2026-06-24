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
  ProfileRow,
  ProfileStats
} from "@/lib/types";

export const DASHBOARD_TAG = "dashboard";

type GlobalDashboard = {
  matches: MatchRow[];
  predictions: PredictionRow[];
  groupPredictions: GroupPredictionRow[];
  groups: GroupView[];
  leaderboard: LeaderboardRow[];
  profileStatsById: Record<string, ProfileStats>;
  statsByMatch: Record<string, MatchPredictionStats>;
  advancedTeams: string[];
  nextMatch: MatchRow | null;
  groupPicksAvailable: boolean;
};

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

    const standings = buildStandings(profiles, predictions, groupPredictions, matches);

    return {
      matches,
      predictions,
      groupPredictions,
      groups: buildGroups(matches),
      leaderboard: standings.leaderboard,
      profileStatsById: standings.profileStatsById,
      statsByMatch,
      advancedTeams: getAdvancedTeams(matches),
      nextMatch,
      groupPicksAvailable: !groupPredictionsMissing
    };
  },
  ["dashboard-global-v2"],
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
    profileStatsById: global.profileStatsById,
    currentLeaderboardRow,
    nextMatch: global.nextMatch,
    groupPicksAvailable: global.groupPicksAvailable
  };
}

function isExactPrediction(prediction: PredictionRow, match: MatchRow | undefined): boolean {
  return Boolean(
    match &&
      match.status === "FINISHED" &&
      match.home_score !== null &&
      match.away_score !== null &&
      prediction.predicted_home_score !== null &&
      prediction.predicted_away_score !== null &&
      prediction.predicted_home_score === match.home_score &&
      prediction.predicted_away_score === match.away_score
  );
}

function buildStandings(
  profiles: ProfileRow[],
  predictions: PredictionRow[],
  groupPredictions: GroupPredictionRow[],
  matches: MatchRow[]
): { leaderboard: LeaderboardRow[]; profileStatsById: Record<string, ProfileStats> } {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const rows = new Map<string, LeaderboardRow>();
  const decidedByUser = new Map<string, PredictionRow[]>();

  // Shared denominator for standardized accuracy: every match that has a result,
  // so skipping a game counts the same as getting it wrong. Same for all players.
  const decidedTotal = matches.filter((match) => match.result_winner !== null).length;

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
      decided: 0,
      decided_total: decidedTotal,
      accuracy: 0,
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

    const match = matchById.get(prediction.match_id);

    row.match_points += prediction.points;
    row.picks += 1;

    if (prediction.is_correct !== null) {
      row.decided += 1;
      const list = decidedByUser.get(prediction.user_id) ?? [];
      list.push(prediction);
      decidedByUser.set(prediction.user_id, list);
    }

    if (prediction.is_correct) {
      row.correct += 1;
    }

    if (isExactPrediction(prediction, match)) {
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
    row.accuracy = row.decided > 0 ? Math.round((row.correct / row.decided) * 100) : 0;
  }

  const leaderboard = Array.from(rows.values())
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

  const profileStatsById: Record<string, ProfileStats> = {};
  for (const row of leaderboard) {
    const decided = (decidedByUser.get(row.user_id) ?? []).slice().sort((a, b) => {
      const aStart = matchById.get(a.match_id)?.starts_at ?? "";
      const bStart = matchById.get(b.match_id)?.starts_at ?? "";
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });

    let best = 0;
    let run = 0;
    for (const prediction of decided) {
      if (prediction.is_correct) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }

    profileStatsById[row.user_id] = { ...row, current_streak: run, best_streak: best };
  }

  return { leaderboard, profileStatsById };
}
