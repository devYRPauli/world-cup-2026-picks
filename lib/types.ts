export type UserRole = "member" | "admin";
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";
export type Pick = "home" | "draw" | "away";

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
  updated_at: string;
};

export type MatchRow = {
  id: string;
  external_id: string | null;
  competition: string;
  stage: string | null;
  group_name: string | null;
  matchday: number | null;
  home_team: string;
  away_team: string;
  home_badge: string | null;
  away_badge: string | null;
  starts_at: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  result_winner: Pick | null;
  source: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PredictionRow = {
  id: string;
  match_id: string;
  user_id: string;
  pick: Pick;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points: number;
  is_correct: boolean | null;
  created_at: string;
  updated_at: string;
};

export type GroupPredictionRow = {
  id: string;
  group_name: string;
  user_id: string;
  picked_team_1: string;
  picked_team_2: string;
  picked_team_3: string | null;
  points: number;
  is_scored: boolean;
  created_at: string;
  updated_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_color: string;
  points: number;
  match_points: number;
  group_points: number;
  correct: number;
  picks: number;
  decided: number;
  decided_total: number;
  accuracy: number;
  exact_scores: number;
  group_hits: number;
  // Knockout-only tally (Round of 32 onward): a separate leaderboard view that
  // ignores group-stage picks and the group bonus.
  knockout_points: number;
  knockout_correct: number;
  knockout_decided: number;
  rank: number;
};

export type ProfileStats = LeaderboardRow & {
  current_streak: number;
  best_streak: number;
};

export type MatchPredictionStats = {
  total: number;
  home: number;
  draw: number;
  away: number;
};

export type GroupTeam = {
  name: string;
  badge: string | null;
};

export type GroupStandingRow = {
  team: string;
  badge: string | null;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
};

export type GroupView = {
  name: string;
  display_name: string;
  teams: GroupTeam[];
  starts_at: string | null;
  is_locked: boolean;
  is_complete: boolean;
  standings: GroupStandingRow[];
};
