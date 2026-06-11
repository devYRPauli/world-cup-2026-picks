import type { MatchStatus } from "@/lib/types";

export function StatusPill({
  status,
  locked
}: {
  status: MatchStatus;
  locked?: boolean;
}) {
  if (status === "FINISHED") {
    return <span className="status-pill finished">Final</span>;
  }

  if (status === "LIVE") {
    return <span className="status-pill live">Live</span>;
  }

  if (locked) {
    return <span className="status-pill locked">Locked</span>;
  }

  if (status === "POSTPONED") {
    return <span className="status-pill">Postponed</span>;
  }

  return <span className="status-pill">Open</span>;
}

