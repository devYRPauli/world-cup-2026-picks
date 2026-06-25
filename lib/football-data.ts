import { getEnv } from "@/lib/env";
import { recalculateGroupPredictions, recalculateManyMatches } from "@/lib/results";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MatchRow, MatchStatus, Pick } from "@/lib/types";

// `Pick` here is the imported match-pick type, which shadows the TS `Pick<>`
// utility — so this snapshot type is spelled out explicitly.
type PriorResult = {
  external_id: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  result_winner: Pick | null;
};

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage?: string;
  group?: string | null;
  venue?: string | null;
  homeTeam: {
    name?: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  awayTeam: {
    name?: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type FootballDataWinner = "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null | undefined;

type FootballDataResponse = {
  matches?: FootballDataMatch[];
};

export async function syncWorldCupMatches() {
  const token = getEnv().footballDataToken;
  if (!token) {
    throw new Error("FOOTBALL_DATA_TOKEN is not configured.");
  }

  const response = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    {
      headers: {
        "X-Auth-Token": token,
        "X-Unfold-Goals": "true"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`football-data.org returned ${response.status}: ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as FootballDataResponse;
  const rows = (payload.matches ?? []).map(mapFootballDataMatch);
  const supabase = getSupabaseAdminClient();

  // Snapshot the stored result fields before writing, so we can report how many
  // matches actually changed this sync. Scoring itself is recomputed in full
  // below, so the sync stays authoritative regardless of this count.
  const { data: priorRows, error: priorError } = await supabase
    .from("matches")
    .select("external_id, status, home_score, away_score, result_winner")
    .returns<PriorResult[]>();

  if (priorError) {
    throw new Error(priorError.message);
  }

  const priorByExternalId = new Map<string, PriorResult>();
  for (const row of priorRows ?? []) {
    if (row.external_id) {
      priorByExternalId.set(row.external_id, row);
    }
  }

  const { data, error } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "external_id" })
    .select("*")
    .returns<MatchRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const changed = (data ?? []).filter((match) => {
    const prior = match.external_id ? priorByExternalId.get(match.external_id) : undefined;
    return !prior || matchResultChanged(prior, match);
  });

  // Recompute every match and the group bonus on every sync so the result is
  // always fully authoritative: a sync that failed midway can't leave stale
  // scores behind, and the group bonus updates the moment the knockout fixtures
  // receive their real teams. The `changed` count above is reporting only.
  const recalculated = await recalculateManyMatches((data ?? []).map((match) => match.id));
  const groupRecalculated = await recalculateGroupPredictions();

  return {
    imported: rows.length,
    changed: changed.length,
    recalculated,
    groupRecalculated
  };
}

function matchResultChanged(prior: PriorResult, next: MatchRow) {
  return (
    prior.status !== next.status ||
    prior.home_score !== next.home_score ||
    prior.away_score !== next.away_score ||
    prior.result_winner !== next.result_winner
  );
}

function mapFootballDataMatch(match: FootballDataMatch) {
  return {
    external_id: `football-data:${match.id}`,
    competition: "FIFA World Cup 2026",
    stage: match.stage ?? null,
    group_name: match.group ?? null,
    matchday: match.matchday ?? null,
    home_team: getTeamName(match.homeTeam),
    away_team: getTeamName(match.awayTeam),
    home_badge: match.homeTeam.crest ?? null,
    away_badge: match.awayTeam.crest ?? null,
    starts_at: match.utcDate,
    venue: match.venue ?? null,
    status: mapStatus(match.status),
    home_score: match.score?.fullTime?.home ?? null,
    away_score: match.score?.fullTime?.away ?? null,
    result_winner: mapWinner(match.score?.winner ?? null),
    source: "football-data.org",
    last_synced_at: new Date().toISOString()
  };
}

function getTeamName(team: FootballDataMatch["homeTeam"]) {
  return team.name ?? team.shortName ?? team.tla ?? "TBD";
}

function mapStatus(status: string): MatchStatus {
  if (status === "FINISHED") {
    return "FINISHED";
  }

  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) {
    return "LIVE";
  }

  if (["POSTPONED", "SUSPENDED", "CANCELLED"].includes(status)) {
    return "POSTPONED";
  }

  return "SCHEDULED";
}

function mapWinner(winner: FootballDataWinner): Pick | null {
  if (winner === "HOME_TEAM") {
    return "home";
  }

  if (winner === "AWAY_TEAM") {
    return "away";
  }

  if (winner === "DRAW") {
    return "draw";
  }

  return null;
}
