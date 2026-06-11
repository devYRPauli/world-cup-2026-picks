import { CalendarClock } from "lucide-react";
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

type View = "matches" | "groups" | "leaderboard";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; md?: string; message?: string; error?: string }>;
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

  const view = resolveView(params.tab);
  const selectedMatchday = resolveMatchday(params.md, visibleMatches, matchdays);
  const shownMatches = selectedMatchday
    ? visibleMatches.filter((match) => match.matchday === selectedMatchday)
    : [];

  const current = data.currentLeaderboardRow;
  const nextLockMinutes = data.nextMatch ? minutesUntil(data.nextMatch.starts_at) : null;
  const activeNav = view === "matches" ? "home" : view;

  return (
    <main className="shell">
      <AppHeader profile={session.profile} active={activeNav} />

      {params.message ? <Notice text={params.message} /> : null}
      {params.error ? <Notice text={params.error} error /> : null}

      <section className="summary" aria-label="Your summary">
        <div className="stat">
          <div className="k">Your rank</div>
          <div className="v">
            <span className="accent">{current ? `#${current.rank}` : "—"}</span>
          </div>
          <div className="s">{session.profile.display_name}</div>
        </div>
        <div className="stat">
          <div className="k">Your points</div>
          <div className="v tnum">{current?.points ?? 0}</div>
          <div className="s">
            {current ? `${current.correct}/${current.picks} correct · ${current.exact_scores} exact` : "No picks yet"}
          </div>
        </div>
        <div className="stat">
          <div className="k">Next lock</div>
          <div className="v tnum">
            {nextLockMinutes === null ? "—" : nextLockMinutes <= 0 ? "Now" : formatCountdown(nextLockMinutes)}
          </div>
          <div className="s">
            {data.nextMatch ? `${data.nextMatch.home_team} vs ${data.nextMatch.away_team}` : "No upcoming matches"}
          </div>
        </div>
      </section>

      {view === "leaderboard" ? (
        <Leaderboard rows={data.leaderboard} currentUserId={session.user.id} variant="full" />
      ) : (
        <div className="layout">
          <section>
            {view === "groups" ? (
              <>
                <p className="section-eyebrow">Group qualifier picks</p>
                <GroupPicks
                  available={data.groupPicksAvailable}
                  groups={data.groups}
                  predictionsByGroup={data.userGroupPredictionsByGroup}
                />
              </>
            ) : (
              <>
                <MatchdayTabs matchdays={matchdays} selectedMatchday={selectedMatchday} />
                <p className="section-eyebrow">
                  {selectedMatchday ? `Matchday ${selectedMatchday}` : "Matches"} · {shownMatches.length}{" "}
                  {shownMatches.length === 1 ? "match" : "matches"}
                </p>
                {shownMatches.length ? (
                  <div className="cards">
                    {shownMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={data.userPredictionsByMatch.get(match.id)}
                        stats={data.statsByMatch.get(match.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <CalendarClock size={22} style={{ opacity: 0.6, marginBottom: 8 }} />
                    <div>No known group-stage matches here yet. Sync fixtures from the admin page.</div>
                  </div>
                )}
              </>
            )}
          </section>
          <Leaderboard rows={data.leaderboard} currentUserId={session.user.id} />
        </div>
      )}
    </main>
  );
}

function Notice({ text, error }: { text: string; error?: boolean }) {
  return <div className={`notice ${error ? "error" : ""}`}>{text}</div>;
}

function resolveView(tab: string | undefined): View {
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

function formatCountdown(mins: number) {
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
