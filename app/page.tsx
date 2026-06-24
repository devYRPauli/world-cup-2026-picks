import { DashboardClient } from "@/components/dashboard-client";
import { SetupScreen } from "@/components/setup-screen";
import type { DashboardView } from "@/components/app-header";
import { getDashboardData } from "@/lib/dashboard";
import { getMissingServerEnv, hasServerSupabaseEnv } from "@/lib/env";
import {
  getKnockoutMatches,
  getKnockoutRounds,
  getVisibleMatchdays,
  getVisibleMatches,
  isKnockoutPhase
} from "@/lib/groups";
import { requireCurrentProfile } from "@/lib/auth";
import type { MatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; md?: string; round?: string; message?: string; error?: string }>;
}) {
  if (!hasServerSupabaseEnv()) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const session = await requireCurrentProfile();
  if (!session.profile) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const params = await searchParams;
  const data = await getDashboardData(session.user.id);
  const visibleMatches = getVisibleMatches(data.matches);
  const matchdays = getVisibleMatchdays(data.matches);
  const knockoutPhase = isKnockoutPhase(data.matches);
  const knockoutMatches = getKnockoutMatches(data.matches);
  const knockoutRounds = getKnockoutRounds(data.matches);

  return (
    <DashboardClient
      profile={session.profile}
      userId={session.user.id}
      initialTab={resolveTab(params.tab)}
      initialMd={resolveMatchday(params.md, visibleMatches, matchdays)}
      message={typeof params.message === "string" ? params.message : null}
      error={typeof params.error === "string" ? params.error : null}
      visibleMatches={visibleMatches}
      matchdays={matchdays}
      knockoutPhase={knockoutPhase}
      knockoutMatches={knockoutMatches}
      knockoutRounds={knockoutRounds}
      initialRound={resolveRound(params.round, knockoutRounds, data.matches)}
      groups={data.groups}
      groupPicksAvailable={data.groupPicksAvailable}
      advancedTeams={data.advancedTeams}
      leaderboard={data.leaderboard}
      profileStats={data.profileStatsById}
      currentRow={data.currentLeaderboardRow}
      nextMatch={
        data.nextMatch
          ? {
              home_team: data.nextMatch.home_team,
              away_team: data.nextMatch.away_team,
              starts_at: data.nextMatch.starts_at
            }
          : null
      }
      userPredictions={Object.fromEntries(data.userPredictionsByMatch)}
      stats={Object.fromEntries(data.statsByMatch)}
      userGroupPredictions={Object.fromEntries(data.userGroupPredictionsByGroup)}
    />
  );
}

function resolveTab(tab: string | undefined): DashboardView {
  if (tab === "groups") return "groups";
  if (tab === "leaderboard") return "leaderboard";
  return "matches";
}

function resolveMatchday(md: string | undefined, matches: MatchRow[], matchdays: number[]): number | null {
  if (md) {
    const parsed = Number.parseInt(md, 10);
    if (matchdays.includes(parsed)) return parsed;
  }

  const now = Date.now();
  const next = matches.find((match) => new Date(match.starts_at).getTime() > now);
  if (next?.matchday && matchdays.includes(next.matchday)) return next.matchday;

  return matchdays[0] ?? null;
}

function resolveRound(
  round: string | undefined,
  rounds: { stage: string }[],
  matches: MatchRow[]
): string | null {
  if (rounds.length === 0) {
    return null;
  }

  if (round) {
    const upper = round.toUpperCase();
    if (rounds.some((entry) => entry.stage === upper)) {
      return upper;
    }
  }

  const now = Date.now();
  const next = matches.find((match) => new Date(match.starts_at).getTime() > now);
  if (next?.stage) {
    const upper = next.stage.toUpperCase();
    if (rounds.some((entry) => entry.stage === upper)) {
      return upper;
    }
  }

  return rounds[0].stage;
}
