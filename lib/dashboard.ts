import { cache } from "react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGroups, getAdvancedTeams, isKnockout, scoreAdvancers } from "@/lib/groups";
import { scorePrediction } from "@/lib/scoring";
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

// Supabase caps a single response at 1000 rows, so page through to read them all
// (there are already more than 1000 predictions). Without this the leaderboard
// silently drops rows, and an unstable order made it drop a different set each
// request - undercounting picks and making the standings flip-flop.
async function fetchAllPredictions(
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<PredictionRow[]> {
  const pageSize = 1000;
  const rows: PredictionRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<PredictionRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

// Deduped per request only (React cache), never cached across requests. The
// page is force-dynamic, so every load reads fresh from Postgres. A persistent
// unstable_cache here served stale snapshots that revalidateTag did not reliably
// purge on Vercel, so freshly-saved picks did not show up on refresh.
const loadGlobalDashboard = cache(
  async (): Promise<GlobalDashboard> => {
    const supabase = getSupabaseAdminClient();
    const [matchesResult, predictions, profilesResult, groupPredictionsResult] = await Promise.all([
      supabase.from("matches").select("*").order("starts_at", { ascending: true }).returns<MatchRow[]>(),
      fetchAllPredictions(supabase),
      supabase.from("profiles").select("*").order("display_name", { ascending: true }).returns<ProfileRow[]>(),
      supabase.from("group_predictions").select("*").returns<GroupPredictionRow[]>()
    ]);

    if (matchesResult.error) {
      throw new Error(matchesResult.error.message);
    }
    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    const groupPredictionsMissing = groupPredictionsResult.error?.code === "42P01";
    if (groupPredictionsResult.error && !groupPredictionsMissing) {
      throw new Error(groupPredictionsResult.error.message);
    }

    const matches = matchesResult.data ?? [];
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
  }
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

const ROUND_OF_32_SIZE = 32;

function buildStandings(
  profiles: ProfileRow[],
  predictions: PredictionRow[],
  groupPredictions: GroupPredictionRow[],
  matches: MatchRow[]
): { leaderboard: LeaderboardRow[]; profileStatsById: Record<string, ProfileStats> } {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const rows = new Map<string, LeaderboardRow>();
  const decidedByUser = new Map<string, { startsAt: string; isCorrect: boolean }[]>();

  // Scoring is computed live here, never stored: read the match result, compare the
  // pick, +3 for a correct outcome and 0 otherwise. Only FINISHED matches count
  // (scorePrediction returns isCorrect: null for LIVE/scheduled), so a live match
  // never moves the board until it is final.

  // Group bonus is derived from who has actually advanced, gated on the full
  // Round of 32 being resolved (all 32 advancers known).
  const advanced = new Set(getAdvancedTeams(matches));
  const bracketResolved = advanced.size >= ROUND_OF_32_SIZE;

  // Shared denominator for standardized accuracy: every finished match, so skipping
  // a game counts the same as getting it wrong. Same for all players.
  const decidedTotal = matches.filter(
    (match) => match.status === "FINISHED" && match.result_winner !== null
  ).length;

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
      knockout_points: 0,
      knockout_correct: 0,
      knockout_decided: 0,
      rank: 0
    });
  }

  for (const prediction of predictions) {
    const row = rows.get(prediction.user_id);
    if (!row) {
      continue;
    }

    const match = matchById.get(prediction.match_id);
    const score = match ? scorePrediction(prediction, match) : null;

    row.match_points += score?.points ?? 0;
    row.picks += 1;

    if (score && score.isCorrect !== null) {
      row.decided += 1;
      const list = decidedByUser.get(prediction.user_id) ?? [];
      list.push({ startsAt: match?.starts_at ?? "", isCorrect: score.isCorrect });
      decidedByUser.set(prediction.user_id, list);

      if (score.isCorrect) {
        row.correct += 1;
      }

      // Knockout-only tally for the separate Round-of-32-onward leaderboard view.
      if (match && isKnockout(match)) {
        row.knockout_decided += 1;
        row.knockout_points += score.points;
        if (score.isCorrect) {
          row.knockout_correct += 1;
        }
      }
    }

    if (score?.exactScore) {
      row.exact_scores += 1;
    }
  }

  for (const prediction of groupPredictions) {
    const row = rows.get(prediction.user_id);
    if (!row || !bracketResolved) {
      continue;
    }

    const picks = [prediction.picked_team_1, prediction.picked_team_2, prediction.picked_team_3].filter(
      (team): team is string => Boolean(team)
    );
    const points = scoreAdvancers(picks, advanced);
    row.group_points += points;
    row.group_hits += points / 5;
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
    const decided = (decidedByUser.get(row.user_id) ?? [])
      .slice()
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    let best = 0;
    let run = 0;
    for (const entry of decided) {
      if (entry.isCorrect) {
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
