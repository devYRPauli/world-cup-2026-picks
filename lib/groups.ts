import { getGroupLockOverride } from "@/lib/env";
import type { GroupStandingRow, GroupTeam, GroupView, MatchRow } from "@/lib/types";

const TBD_NAMES = new Set(["TBD", "TBA", "To Be Decided", "To be decided"]);

export function isGroupStageMatch(match: MatchRow) {
  return Boolean(match.group_name) || match.stage?.toUpperCase().includes("GROUP");
}

export function isKnownTeam(name: string) {
  return Boolean(name.trim()) && !TBD_NAMES.has(name.trim());
}

export function displayGroupName(groupName: string | null) {
  if (!groupName) {
    return "Group";
  }

  return groupName
    .replace(/^GROUP[_\s-]*/i, "Group ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getVisibleMatchdays(matches: MatchRow[]) {
  const values = new Set<number>();

  for (const match of matches) {
    if (isGroupStageMatch(match) && match.matchday !== null && hasKnownTeams(match)) {
      values.add(match.matchday);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

export function getVisibleMatches(matches: MatchRow[]) {
  return matches.filter((match) => isGroupStageMatch(match) && hasKnownTeams(match));
}

export function buildGroups(matches: MatchRow[]) {
  const grouped = new Map<string, MatchRow[]>();

  for (const match of matches) {
    if (!isGroupStageMatch(match) || !match.group_name || !hasKnownTeams(match)) {
      continue;
    }

    const current = grouped.get(match.group_name) ?? [];
    current.push(match);
    grouped.set(match.group_name, current);
  }

  return Array.from(grouped.entries())
    .map(([name, groupMatches]) => buildGroup(name, groupMatches))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { numeric: true }));
}

export function getAdvancedTeams(matches: MatchRow[]): string[] {
  const realTeams = new Set<string>();
  for (const match of matches) {
    if (!isGroupStageMatch(match)) {
      continue;
    }
    if (isKnownTeam(match.home_team)) {
      realTeams.add(match.home_team);
    }
    if (isKnownTeam(match.away_team)) {
      realTeams.add(match.away_team);
    }
  }

  const advanced = new Set<string>();
  for (const match of matches) {
    if (isGroupStageMatch(match)) {
      continue;
    }
    if (realTeams.has(match.home_team)) {
      advanced.add(match.home_team);
    }
    if (realTeams.has(match.away_team)) {
      advanced.add(match.away_team);
    }
  }

  return Array.from(advanced);
}

export function scoreAdvancers(picks: string[], advanced: Set<string>) {
  return picks.filter((pick) => advanced.has(pick)).length * 5;
}

function buildGroup(name: string, matches: MatchRow[]): GroupView {
  const teams = getGroupTeams(matches);
  const earliestKickoff = matches
    .map((match) => match.starts_at)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
  // A temporary deadline override (env) replaces the earliest-kickoff lock for
  // this group only; it self-expires once the override instant passes.
  const lockAt = getGroupLockOverride(name) ?? earliestKickoff;
  const now = Date.now();
  const standings = buildStandings(matches, teams);
  const isComplete =
    matches.length > 0 &&
    matches.every(
      (match) =>
        match.status === "FINISHED" && match.home_score !== null && match.away_score !== null
    );

  return {
    name,
    display_name: displayGroupName(name),
    teams,
    starts_at: lockAt,
    is_locked: lockAt ? new Date(lockAt).getTime() <= now : false,
    is_complete: isComplete,
    standings
  };
}

function getGroupTeams(matches: MatchRow[]) {
  const teams = new Map<string, GroupTeam>();

  for (const match of matches) {
    if (isKnownTeam(match.home_team)) {
      teams.set(match.home_team, { name: match.home_team, badge: match.home_badge });
    }

    if (isKnownTeam(match.away_team)) {
      teams.set(match.away_team, { name: match.away_team, badge: match.away_badge });
    }
  }

  return Array.from(teams.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildStandings(matches: MatchRow[], teams: GroupTeam[]) {
  const rows = new Map<string, GroupStandingRow>();

  for (const team of teams) {
    rows.set(team.name, {
      team: team.name,
      badge: team.badge,
      played: 0,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0
    });
  }

  for (const match of matches) {
    if (match.status !== "FINISHED" || match.home_score === null || match.away_score === null) {
      continue;
    }

    const home = rows.get(match.home_team);
    const away = rows.get(match.away_team);
    if (!home || !away) {
      continue;
    }

    applyResult(home, match.home_score, match.away_score);
    applyResult(away, match.away_score, match.home_score);

    if (match.home_score > match.away_score) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.away_score > match.home_score) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.goal_difference !== a.goal_difference) {
      return b.goal_difference - a.goal_difference;
    }

    if (b.goals_for !== a.goals_for) {
      return b.goals_for - a.goals_for;
    }

    return a.team.localeCompare(b.team);
  });
}

function applyResult(row: GroupStandingRow, goalsFor: number, goalsAgainst: number) {
  row.played += 1;
  row.goals_for += goalsFor;
  row.goals_against += goalsAgainst;
  row.goal_difference = row.goals_for - row.goals_against;
}

function hasKnownTeams(match: MatchRow) {
  return isKnownTeam(match.home_team) && isKnownTeam(match.away_team);
}
