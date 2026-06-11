import Link from "next/link";

export function MatchdayTabs({
  matchdays,
  selectedTab
}: {
  matchdays: number[];
  selectedTab: string;
}) {
  return (
    <nav className="tab-strip" aria-label="Dashboard sections">
      <Link className={`tab-link ${selectedTab === "groups" ? "active" : ""}`} href="/?tab=groups">
        Group picks
      </Link>
      {matchdays.map((matchday) => {
        const key = `md-${matchday}`;
        return (
          <Link
            className={`tab-link ${selectedTab === key ? "active" : ""}`}
            href={`/?tab=${key}`}
            key={key}
          >
            Matchday {matchday}
          </Link>
        );
      })}
    </nav>
  );
}
