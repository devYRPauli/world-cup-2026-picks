"use client";

import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { AppHeader, type DashboardView } from "@/components/app-header";
import { GroupPicks } from "@/components/group-picks";
import { Leaderboard } from "@/components/leaderboard";
import { MatchCard } from "@/components/match-card";
import { ProfileModal } from "@/components/profile-modal";
import { isMatchLocked, minutesUntil } from "@/lib/format";
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

type NextMatch = { home_team: string; away_team: string; starts_at: string };

export function DashboardClient({
  profile,
  userId,
  initialTab,
  initialMd,
  message,
  error,
  visibleMatches,
  matchdays,
  groups,
  groupPicksAvailable,
  advancedTeams,
  leaderboard,
  profileStats,
  currentRow,
  nextMatch,
  userPredictions,
  stats,
  userGroupPredictions
}: {
  profile: ProfileRow;
  userId: string;
  initialTab: DashboardView;
  initialMd: number | null;
  message: string | null;
  error: string | null;
  visibleMatches: MatchRow[];
  matchdays: number[];
  groups: GroupView[];
  groupPicksAvailable: boolean;
  advancedTeams: string[];
  leaderboard: LeaderboardRow[];
  profileStats: Record<string, ProfileStats>;
  currentRow: LeaderboardRow | null;
  nextMatch: NextMatch | null;
  userPredictions: Record<string, PredictionRow>;
  stats: Record<string, MatchPredictionStats>;
  userGroupPredictions: Record<string, GroupPredictionRow>;
}) {
  const [tab, setTab] = useState<DashboardView>(initialTab);
  const [md, setMd] = useState<number | null>(initialMd);
  const [profileId, setProfileId] = useState<string | null>(null);

  const groupPredictionsByGroup = useMemo(
    () => new Map(Object.entries(userGroupPredictions)),
    [userGroupPredictions]
  );

  function goTo(view: DashboardView, matchday = md) {
    setTab(view);
    if (view === "matches" && matchday !== md) {
      setMd(matchday);
    }
    syncUrl(view, view === "matches" ? matchday : null);
  }

  function selectMatchday(value: number) {
    setMd(value);
    setTab("matches");
    syncUrl("matches", value);
  }

  const activeNav = tab === "matches" ? "home" : tab;
  const shownMatches = md ? visibleMatches.filter((match) => match.matchday === md) : [];
  const lockedMatches = shownMatches.filter((match) => isMatchLocked(match));
  const openByPick = (picked: boolean) =>
    shownMatches.filter((match) => !isMatchLocked(match) && Boolean(userPredictions[match.id]) === picked);
  const unpickedMatches = openByPick(false);
  const openMatches = [...unpickedMatches, ...openByPick(true)];
  const nextLockMinutes = nextMatch ? minutesUntil(nextMatch.starts_at) : null;

  const renderCard = (match: MatchRow) => (
    <MatchCard
      key={match.id}
      match={match}
      prediction={userPredictions[match.id]}
      stats={stats[match.id]}
    />
  );

  return (
    <main className="shell">
      <AppHeader profile={profile} active={activeNav} onNavigate={goTo} />

      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <section className="summary" aria-label="Your summary">
        <div className="stat">
          <div className="k">Your rank</div>
          <div className="v">
            <span className="accent">{currentRow ? `#${currentRow.rank}` : "-"}</span>
          </div>
          <div className="s">{profile.display_name}</div>
        </div>
        <div className="stat">
          <div className="k">Your points</div>
          <div className="v tnum">{currentRow?.points ?? 0}</div>
          <div className="s">
            {currentRow && currentRow.decided > 0
              ? `${currentRow.correct} of ${currentRow.decided} correct / ${currentRow.accuracy}%`
              : currentRow
                ? `${currentRow.picks} picks in`
                : "No picks yet"}
          </div>
        </div>
        <div className="stat">
          <div className="k">Next lock</div>
          <div className="v tnum">
            {nextLockMinutes === null ? "-" : nextLockMinutes <= 0 ? "Now" : formatCountdown(nextLockMinutes)}
          </div>
          <div className="s">
            {nextMatch ? `${nextMatch.home_team} vs ${nextMatch.away_team}` : "No upcoming matches"}
          </div>
        </div>
      </section>

      {tab === "leaderboard" ? (
        <Leaderboard rows={leaderboard} currentUserId={userId} variant="full" onSelect={setProfileId} />
      ) : tab === "groups" ? (
        <section>
          <p className="section-eyebrow">Group qualifier picks</p>
          <GroupPicks
            available={groupPicksAvailable}
            groups={groups}
            predictionsByGroup={groupPredictionsByGroup}
            advancedTeams={advancedTeams}
          />
        </section>
      ) : (
        <section>
          {matchdays.length ? (
            <nav className="tabs" aria-label="Matchdays">
              {matchdays.map((matchday) => (
                <button
                  key={matchday}
                  type="button"
                  className={`tab ${md === matchday ? "active" : ""}`}
                  onClick={() => selectMatchday(matchday)}
                >
                  Matchday {matchday}
                </button>
              ))}
            </nav>
          ) : null}
          <p className="section-eyebrow">
            {md ? `Matchday ${md}` : "Matches"} / {shownMatches.length}{" "}
            {shownMatches.length === 1 ? "match" : "matches"}
            {openMatches.length ? <span className="eyebrow-open"> / {openMatches.length} open</span> : null}
            {unpickedMatches.length ? (
              <span className="eyebrow-nudge"> / {unpickedMatches.length} need your pick</span>
            ) : null}
          </p>
          {shownMatches.length ? (
            <>
              {openMatches.length ? <div className="cards">{openMatches.map(renderCard)}</div> : null}
              {lockedMatches.length && openMatches.length ? (
                <details className="locked-group">
                  <summary>
                    {lockedMatches.length} locked &amp; completed
                  </summary>
                  <div className="cards">{lockedMatches.map(renderCard)}</div>
                </details>
              ) : lockedMatches.length ? (
                <div className="cards">{lockedMatches.map(renderCard)}</div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <CalendarClock size={22} style={{ opacity: 0.6, marginBottom: 8 }} />
              <div>No known group-stage matches here yet. Sync fixtures from the admin page.</div>
            </div>
          )}
        </section>
      )}

      <ProfileModal
        stats={profileId ? profileStats[profileId] ?? null : null}
        isCurrentUser={profileId === userId}
        onClose={() => setProfileId(null)}
      />
    </main>
  );
}

function syncUrl(view: DashboardView, md: number | null) {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams();
  params.set("tab", view);
  if (view === "matches" && md !== null) {
    params.set("md", String(md));
  }
  window.history.replaceState(null, "", `/?${params.toString()}`);
}

function formatCountdown(mins: number) {
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
