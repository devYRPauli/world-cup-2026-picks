import Link from "next/link";

export function MatchdayTabs({
  matchdays,
  selectedMatchday
}: {
  matchdays: number[];
  selectedMatchday: number | null;
}) {
  if (!matchdays.length) {
    return null;
  }

  return (
    <nav className="tabs" aria-label="Matchdays">
      {matchdays.map((matchday) => (
        <Link
          key={matchday}
          href={`/?tab=matches&md=${matchday}`}
          className={`tab ${selectedMatchday === matchday ? "active" : ""}`}
        >
          Matchday {matchday}
        </Link>
      ))}
    </nav>
  );
}
