import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Leaderboard } from "@/components/leaderboard";
import { MatchCard } from "@/components/match-card";
import { SetupScreen } from "@/components/setup-screen";
import { getDashboardData } from "@/lib/dashboard";
import { getMissingServerEnv, hasServerSupabaseEnv } from "@/lib/env";
import { minutesUntil } from "@/lib/format";
import { requireCurrentProfile } from "@/lib/auth";
import type { MatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const filters = [
  ["upcoming", "Upcoming"],
  ["all", "All"],
  ["finished", "Finished"],
  ["locked", "Locked"]
] as const;

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; message?: string; error?: string }>;
}) {
  if (!hasServerSupabaseEnv()) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const session = await requireCurrentProfile();
  if (!session.profile) {
    return <SetupScreen missing={getMissingServerEnv()} />;
  }

  const params = await searchParams;
  const selectedView = filters.some(([key]) => key === params.view) ? params.view ?? "upcoming" : "upcoming";
  const data = await getDashboardData(session.user.id);
  const shownMatches = filterMatches(data.matches, selectedView);
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
          <nav className="filters" aria-label="Match filters">
            {filters.map(([key, label]) => (
              <Link
                className={`filter-link ${selectedView === key ? "active" : ""}`}
                href={key === "upcoming" ? "/" : `/?view=${key}`}
                key={key}
              >
                {label}
              </Link>
            ))}
          </nav>
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
              <div className="empty-state">No matches in this view yet.</div>
            )}
          </div>
        </section>
        <Leaderboard rows={data.leaderboard} currentUserId={session.user.id} />
      </div>
    </main>
  );
}

function filterMatches(matches: MatchRow[], view: string) {
  const now = Date.now();

  if (view === "finished") {
    return matches.filter((match) => match.status === "FINISHED");
  }

  if (view === "locked") {
    return matches.filter(
      (match) => match.status !== "FINISHED" && new Date(match.starts_at).getTime() <= now
    );
  }

  if (view === "all") {
    return matches;
  }

  const upcoming = matches.filter(
    (match) => match.status === "SCHEDULED" && new Date(match.starts_at).getTime() > now
  );

  return upcoming.length ? upcoming : matches;
}
