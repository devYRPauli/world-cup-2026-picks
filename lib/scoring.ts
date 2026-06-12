import type { MatchRow, Pick, PredictionRow } from "@/lib/types";

export function resolveWinner(match: PickableMatch): Pick | null {
  if (match.result_winner) {
    return match.result_winner;
  }

  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  if (match.home_score > match.away_score) {
    return "home";
  }

  if (match.away_score > match.home_score) {
    return "away";
  }

  return "draw";
}

export function scorePrediction(prediction: PredictionRow, match: MatchRow) {
  if (match.status !== "FINISHED") {
    return { points: 0, isCorrect: null, exactScore: false };
  }

  const winner = resolveWinner(match);

  if (!winner) {
    return { points: 0, isCorrect: null, exactScore: false };
  }

  const isCorrect = prediction.pick === winner;
  const exactScore =
    isCorrect &&
    prediction.predicted_home_score !== null &&
    prediction.predicted_away_score !== null &&
    prediction.predicted_home_score === match.home_score &&
    prediction.predicted_away_score === match.away_score;

  // Scoreline is optional and earns no points - correct outcome is a flat 3.
  // `exactScore` is still surfaced as a bragging stat (see lib/dashboard.ts).
  return {
    points: isCorrect ? 3 : 0,
    isCorrect,
    exactScore
  };
}

export function pickLabel(pick: Pick, match: PickableMatch) {
  if (pick === "home") {
    return match.home_team;
  }

  if (pick === "away") {
    return match.away_team;
  }

  return "Draw";
}

type PickableMatch = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  result_winner: MatchRow["result_winner"];
};
