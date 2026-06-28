"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";

type SortBy = "points" | "accuracy" | "knockout";

export function Leaderboard({
  rows,
  currentUserId,
  variant = "sidebar",
  onSelect
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  variant?: "sidebar" | "full";
  onSelect?: (userId: string) => void;
}) {
  const className = variant === "full" ? "lb-full" : "aside";
  const [sortBy, setSortBy] = useState<SortBy>("points");
  const showSort = variant === "full";
  const mode: SortBy = showSort ? sortBy : "points";

  // Standardized accuracy: correct picks over every decided game in the pool, so
  // skipping games is penalized the same as getting them wrong. decided_total is
  // shared across players, giving one comparable accuracy number for everyone.
  const stdAccuracy = (row: LeaderboardRow) =>
    row.decided_total > 0 ? Math.round((row.correct / row.decided_total) * 100) : 0;

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
      : mode === "knockout"
        ? rows
            .slice()
            .sort(
              (a, b) =>
                b.knockout_points - a.knockout_points ||
                b.knockout_correct - a.knockout_correct ||
                a.display_name.localeCompare(b.display_name)
            )
            .map((row, index) => ({ ...row, rank: index + 1 }))
        : rows;

  const tabs: { key: SortBy; label: string }[] = [
    { key: "points", label: "Points" },
    { key: "accuracy", label: "Accuracy" },
    { key: "knockout", label: "Knockout" }
  ];

  const subText = (row: LeaderboardRow) => {
    if (mode === "accuracy") {
      return row.decided_total > 0
        ? `${row.correct} of ${row.decided_total} correct, ${row.decided} bet`
        : "No results yet";
    }
    if (mode === "knockout") {
      return row.knockout_decided > 0
        ? `${row.knockout_correct} of ${row.knockout_decided} correct`
        : "No knockout results yet";
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
                {mode === "accuracy" ? stdAccuracy(row) : mode === "knockout" ? row.knockout_points : row.points}
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
