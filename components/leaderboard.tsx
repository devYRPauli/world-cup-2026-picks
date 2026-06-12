import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";

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

  const body = (
    <>
      <div className="panel-head">
        <span className="ico" aria-hidden="true">
          <Trophy size={20} />
        </span>
        <h2>Leaderboard</h2>
      </div>
      <div className="lb">
        {rows.length ? (
          rows.map((row) => (
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
                    {row.group_points > 0 ? ` / ${row.group_points} group pts` : ""}
                  </span>
                </div>
              </div>
              <div className="pts2 tnum">
                {row.points}
                <small>PTS</small>
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
