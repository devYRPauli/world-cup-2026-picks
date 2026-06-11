import { GroupPicks } from "@/components/group-picks";
import { AppHeader } from "@/components/app-header";
import { Leaderboard } from "@/components/leaderboard";
import { MatchCard } from "@/components/match-card";
import { MatchdayTabs } from "@/components/matchday-tabs";
import { SetupScreen } from "@/components/setup-screen";
import { getDashboardData } from "@/lib/dashboard";
import { getMissingServerEnv, hasServerSupabaseEnv } from "@/lib/env";
import { minutesUntil } from "@/lib/format";
import { getVisibleMatchdays, getVisibleMatches } from "@/lib/groups";
import { requireCurrentProfile } from "@/lib/auth";
import type { MatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; message?: string; error?: string }>;
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
  const defaultTab = getDefaultTab(visibleMatches, matchdays);
  const selectedTab = isValidTab(params.tab, matchdays) ? params.tab ?? defaultTab : defaultTab;
  const shownMatches = selectedTab === "groups" ? [] : filterMatchesByTab(visibleMatches, selectedTab);
  const current = data.currentLeaderboardRow;
  const nextLockMinutes = data.nextMatch ? minutesUntil(data.nextMatch.starts_at) : null;

  return (
    <main className="page-shell">
      <AppHeader profile={session.profile} />

      {params.message ? <div className="notice">{params.message}</div> : null}
      {params.error ? <div className="notice error">{params.error}</div> : null}

      <section className="summary-band" aria-label="Your summary">
        <div className="summary-card">
          <span>Your rank</span>
          <strong>{current ? `#${current.rank}` : "-"}</strong>
          <p>{session.profile.display_name}</p>
        </div>
        <div className="summary-card">
          <span>Your points</span>
          <strong>{current?.points ?? 0}</strong>
          <p>{current ? `${current.correct}/${current.picks} correct` : "No picks yet"}</p>
        </div>
        <div className="summary-card">
          <span>Next lock</span>
          <strong>{nextLockMinutes === null ? "-" : nextLockMinutes <= 0 ? "Now" : `${nextLockMinutes}m`}</strong>
          <p>{data.nextMatch ? `${data.nextMatch.home_team} vs ${data.nextMatch.away_team}` : "No upcoming matches"}</p>
        </div>
      </section>

      <div className="dashboard-grid">
        <section>
          <MatchdayTabs matchdays={matchdays} selectedTab={selectedTab} />
          {selectedTab === "groups" ? (
            <GroupPicks
              available={data.groupPicksAvailable}
              groups={data.groups}
              predictionsByGroup={data.userGroupPredictionsByGroup}
            />
          ) : (
            <div className="match-list">
              {shownMatches.length ? (
                shownMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={data.userPredictionsByMatch.get(match.id)}
                    stats={data.statsByMatch.get(match.id)}
                  />
                ))
              ) : (
                <div className="empty-state">No known group-stage matches in this matchday yet.</div>
              )}
            </div>
          )}
        </section>
        <Leaderboard rows={data.leaderboard} currentUserId={session.user.id} />
      </div>
    </main>
  );
}

function getDefaultTab(matches: MatchRow[], matchdays: number[]) {
  const now = Date.now();
  const nextMatch = matches.find((match) => new Date(match.starts_at).getTime() > now);

  if (nextMatch?.matchday) {
    return `md-${nextMatch.matchday}`;
  }

  return matchdays[0] ? `md-${matchdays[0]}` : "groups";
}

function isValidTab(tab: string | undefined, matchdays: number[]) {
  if (!tab) {
    return true;
  }

  return tab === "groups" || matchdays.some((matchday) => tab === `md-${matchday}`);
}

function filterMatchesByTab(matches: MatchRow[], tab: string) {
  const matchday = Number.parseInt(tab.replace("md-", ""), 10);

  if (Number.isNaN(matchday)) {
    return [];
  }

  return matches.filter((match) => match.matchday === matchday);
}
