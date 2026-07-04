"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { LeaderboardRow, RoundTally } from "@/lib/types";

type SortBy = "points" | "accuracy" | "rounds";

const ZERO_TALLY: RoundTally = { points: 0, correct: 0, decided: 0 };

// Compact labels for the per-round sub-filter pills; falls back to the full label.
const SHORT_ROUND: Record<string, string> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3rd",
  FINAL: "Final"
};

export function Leaderboard({
  rows,
  currentUserId,
  variant = "sidebar",
  onSelect,
  availableRounds = []
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  variant?: "sidebar" | "full";
  onSelect?: (userId: string) => void;
  availableRounds?: { stage: string; label: string }[];
}) {
  const className = variant === "full" ? "lb-full" : "aside";
  const [sortBy, setSortBy] = useState<SortBy>("points");
  // "ALL" = every knockout round combined; otherwise a specific stage.
  const [roundFilter, setRoundFilter] = useState<string>("ALL");
  const showSort = variant === "full";
  const mode: SortBy = showSort ? sortBy : "points";

  // Standardized accuracy: correct picks over every decided game in the pool, so
  // skipping games is penalized the same as getting them wrong. decided_total is
  // shared across players, giving one comparable accuracy number for everyone.
  const stdAccuracy = (row: LeaderboardRow) =>
    row.decided_total > 0 ? Math.round((row.correct / row.decided_total) * 100) : 0;

  // The knockout tally for the active round filter: the aggregate for "ALL",
  // otherwise the single round's bucket (missing -> zeros -> "No results yet").
  const roundTally = (row: LeaderboardRow): RoundTally =>
    roundFilter === "ALL"
      ? { points: row.knockout_points, correct: row.knockout_correct, decided: row.knockout_decided }
      : row.knockout_by_round[roundFilter] ?? ZERO_TALLY;

  const ordered =
    mode === "accuracy"
      ? rows
          .slice()
          .sort(
            (a, b) =>
              stdAccuracy(b) - stdAccuracy(a) ||
              b.decided - a.decided ||
              a.display_name.localeCompare(b.display_name)
          )
          .map((row, index) => ({ ...row, rank: index + 1 }))
      : mode === "rounds"
        ? rows
            .slice()
            .sort((a, b) => {
              const ta = roundTally(a);
              const tb = roundTally(b);
              return (
                tb.points - ta.points ||
                tb.correct - ta.correct ||
                a.display_name.localeCompare(b.display_name)
              );
            })
            .map((row, index) => ({ ...row, rank: index + 1 }))
        : rows;

  const tabs: { key: SortBy; label: string }[] = [
    { key: "points", label: "Points" },
    { key: "accuracy", label: "Accuracy" },
    { key: "rounds", label: "Rounds" }
  ];

  const roundFilters = [
    { stage: "ALL", label: "All" },
    ...availableRounds.map((entry) => ({
      stage: entry.stage,
      label: SHORT_ROUND[entry.stage] ?? entry.label
    }))
  ];

  const subText = (row: LeaderboardRow) => {
    if (mode === "accuracy") {
      return row.decided_total > 0
        ? `${row.correct} of ${row.decided_total} correct, ${row.decided} bet`
        : "No results yet";
    }
    if (mode === "rounds") {
      const tally = roundTally(row);
      if (tally.decided > 0) {
        return `${tally.correct} of ${tally.decided} correct`;
      }
      return roundFilter === "ALL" ? "No knockout results yet" : "No results yet";
    }
    const base = row.decided > 0 ? `${row.correct} of ${row.decided} correct` : "No results yet";
    return row.group_points > 0 ? `${base} / ${row.group_points} group pts` : base;
  };

  const body = (
    <>
      <div className="panel-head">
        <span className="ico" aria-hidden="true">
          <Trophy size={20} />
        </span>
        <h2>Leaderboard</h2>
        {showSort ? (
          <div className="lb-sort" role="tablist" aria-label="Sort leaderboard">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={sortBy === tab.key}
                className={`lb-sort-btn ${sortBy === tab.key ? "active" : ""}`}
                onClick={() => setSortBy(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {showSort && mode === "rounds" && roundFilters.length > 1 ? (
        <div className="lb-sort lb-rounds" role="tablist" aria-label="Filter by round">
          {roundFilters.map((entry) => (
            <button
              key={entry.stage}
              type="button"
              role="tab"
              aria-selected={roundFilter === entry.stage}
              className={`lb-sort-btn ${roundFilter === entry.stage ? "active" : ""}`}
              onClick={() => setRoundFilter(entry.stage)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="lb">
        {ordered.length ? (
          ordered.map((row) => (
            <div
              className={`lb-row ${onSelect ? "clickable" : ""} ${
                row.user_id === currentUserId ? "me" : ""
              } ${row.rank === 1 ? "top" : ""}`}
              key={row.user_id}
              aria-current={row.user_id === currentUserId ? "true" : undefined}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={onSelect ? () => onSelect(row.user_id) : undefined}
              onKeyDown={
                onSelect
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(row.user_id);
                      }
                    }
                  : undefined
              }
            >
              <div className="rank">{row.rank}</div>
              <div className="who">
                <span className="av" style={{ background: row.avatar_color }}>
                  {initials(row.display_name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span className="nm">
                    {row.display_name}
                    {row.user_id === currentUserId ? " (you)" : ""}
                  </span>
                  <span className="sub">{subText(row)}</span>
                </div>
              </div>
              <div className="pts2 tnum">
                {mode === "accuracy" ? stdAccuracy(row) : mode === "rounds" ? roundTally(row).points : row.points}
                <small>{mode === "accuracy" ? "%" : "PTS"}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No picks yet.</div>
        )}
      </div>
    </>
  );

  return variant === "full" ? (
    <section className={className}>{body}</section>
  ) : (
    <aside className={className}>{body}</aside>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
