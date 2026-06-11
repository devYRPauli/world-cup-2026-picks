import { Medal } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";

export function Leaderboard({
  rows,
  currentUserId
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
}) {
  return (
    <aside className="panel">
      <div className="member-line">
        <Medal size={20} color="var(--gold)" />
        <h2>Leaderboard</h2>
      </div>
      <div className="leaderboard-list">
        {rows.length ? (
          rows.map((row) => (
            <div
              className="leaderboard-row"
              key={row.user_id}
              aria-current={row.user_id === currentUserId ? "true" : undefined}
            >
              <div className="rank-badge">{row.rank}</div>
              <div>
                <div className="member-line">
                  <span className="avatar" style={{ background: row.avatar_color }}>
                    {initials(row.display_name)}
                  </span>
                  <span className="member-name">
                    {row.display_name}
                    {row.user_id === currentUserId ? " (you)" : ""}
                  </span>
                </div>
                <small>
                  {row.correct}/{row.picks} correct | {row.exact_scores} exact
                </small>
              </div>
              <div className="points">
                {row.points}
                <small> pts</small>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">No picks yet.</div>
        )}
      </div>
    </aside>
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
