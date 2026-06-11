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

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_color: string;
  points: number;
  correct: number;
  picks: number;
  exact_scores: number;
  rank: number;
};

export type MatchPredictionStats = {
  total: number;
  home: number;
  draw: number;
  away: number;
};

