"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";

type SortBy = "points" | "accuracy";

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
  const byAccuracy = showSort && sortBy === "accuracy";

  const ordered = byAccuracy
    ? rows
        .slice()
        .sort(
          (a, b) =>
            b.accuracy - a.accuracy ||
            b.decided - a.decided ||
            b.correct - a.correct ||
            a.display_name.localeCompare(b.display_name)
        )
        .map((row, index) => ({ ...row, rank: index + 1 }))
    : rows;

  const body = (
    <>
      <div className="panel-head">
        <span className="ico" aria-hidden="true">
          <Trophy size={20} />
        </span>
        <h2>Leaderboard</h2>
        {showSort ? (
          <div className="lb-sort" role="tablist" aria-label="Sort leaderboard">
            <button
              type="button"
              role="tab"
              aria-selected={sortBy === "points"}
              className={`lb-sort-btn ${sortBy === "points" ? "active" : ""}`}
              onClick={() => setSortBy("points")}
            >
              Points
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sortBy === "accuracy"}
              className={`lb-sort-btn ${sortBy === "accuracy" ? "active" : ""}`}
              onClick={() => setSortBy("accuracy")}
            >
              Accuracy
            </button>
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
                  <span className="sub">
                    {row.decided > 0 ? `${row.correct} of ${row.decided} correct` : "No results yet"}
                    {!byAccuracy && row.group_points > 0 ? ` / ${row.group_points} group pts` : ""}
                  </span>
                </div>
              </div>
              <div className="pts2 tnum">
                {byAccuracy ? row.accuracy : row.points}
                <small>{byAccuracy ? "%" : "PTS"}</small>
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
