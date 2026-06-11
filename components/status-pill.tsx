import type { MatchStatus } from "@/lib/types";

export function StatusPill({
  status,
  locked
}: {
  status: MatchStatus;
  locked?: boolean;
}) {
  if (status === "FINISHED") {
    return <span className="pill final">Final</span>;
  }

  if (status === "LIVE") {
    return <span className="pill live">Live</span>;
  }

  if (status === "POSTPONED") {
    return <span className="pill postponed">Postponed</span>;
  }

  if (locked) {
    return <span className="pill locked">Locked</span>;
  }

  return <span className="pill open">Open</span>;
}
