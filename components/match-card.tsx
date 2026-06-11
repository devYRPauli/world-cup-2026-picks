import { CalendarDays, Lock, Save } from "lucide-react";
import { savePredictionAction } from "@/app/predictions/actions";
import { formatDateTime, toTitleCase } from "@/lib/format";
import { pickLabel } from "@/lib/scoring";
import type { MatchPredictionStats, MatchRow, Pick, PredictionRow } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export function MatchCard({
  match,
  prediction,
  stats
}: {
  match: MatchRow;
  prediction?: PredictionRow;
  stats?: MatchPredictionStats;
}) {
  const locked = new Date(match.starts_at).getTime() <= Date.now() || match.status !== "SCHEDULED";
  const score =
    match.home_score !== null && match.away_score !== null
      ? `${match.home_score} - ${match.away_score}`
      : "vs";

  return (
    <article className="match-card">
      <div className="match-topline">
        <div className="match-meta">
          <span>{match.group_name ?? toTitleCase(match.stage)}</span>
          <span>Matchday {match.matchday ?? "-"}</span>
          <span>
            <CalendarDays size={14} /> {formatDateTime(match.starts_at)}
          </span>
        </div>
        <StatusPill status={match.status} locked={locked} />
      </div>
      <div className="match-body">
        <div className="teams">
          <TeamBadge name={match.home_team} badge={match.home_badge} />
          <div className="score-box">
            {score}
            <span>{match.status === "FINISHED" ? "result" : "pick"}</span>
          </div>
          <TeamBadge name={match.away_team} badge={match.away_badge} away />
        </div>

        {match.venue ? <p className="saved-pick">Venue: {match.venue}</p> : null}

        {!locked ? (
          <form action={savePredictionAction} className="pick-form">
            <input name="match_id" type="hidden" value={match.id} />
            <div className="choice-grid" aria-label="Pick outcome">
              <Choice
                label={match.home_team}
                name="pick"
                value="home"
                defaultChecked={prediction?.pick === "home"}
              />
              <Choice
                label="Draw"
                name="pick"
                value="draw"
                defaultChecked={prediction?.pick === "draw" || !prediction}
              />
              <Choice
                label={match.away_team}
                name="pick"
                value="away"
                defaultChecked={prediction?.pick === "away"}
              />
            </div>
            <div className="score-pick-row">
              <div className="field">
                <label htmlFor={`${match.id}-home-score`}>{match.home_team} score</label>
                <input
                  id={`${match.id}-home-score`}
                  min="0"
                  name="predicted_home_score"
                  placeholder="Optional"
                  type="number"
                  defaultValue={prediction?.predicted_home_score ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor={`${match.id}-away-score`}>{match.away_team} score</label>
                <input
                  id={`${match.id}-away-score`}
                  min="0"
                  name="predicted_away_score"
                  placeholder="Optional"
                  type="number"
                  defaultValue={prediction?.predicted_away_score ?? ""}
                />
              </div>
              <button className="button primary" type="submit">
                <Save size={17} />
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="saved-pick">
            <Lock size={17} />
            {prediction ? (
              <>
                Your pick: <strong>{pickLabel(prediction.pick, match)}</strong>
                {prediction.predicted_home_score !== null && prediction.predicted_away_score !== null
                  ? ` (${prediction.predicted_home_score}-${prediction.predicted_away_score})`
                  : ""}
                {match.status === "FINISHED" ? ` | ${prediction.points} pts` : ""}
              </>
            ) : (
              "No saved pick"
            )}
          </div>
        )}

        {stats && stats.total > 0 ? (
          <div className="saved-pick">
            Lab split: {stats.home} {shortName(match.home_team)} | {stats.draw} draw | {stats.away}{" "}
            {shortName(match.away_team)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TeamBadge({ name, badge, away }: { name: string; badge: string | null; away?: boolean }) {
  return (
    <div className={`team ${away ? "away" : ""}`}>
      {!away ? <Badge name={name} badge={badge} /> : null}
      <span className="team-name">{name}</span>
      {away ? <Badge name={name} badge={badge} /> : null}
    </div>
  );
}

function Badge({ name, badge }: { name: string; badge: string | null }) {
  return (
    <span className="badge">
      {badge ? <img alt="" src={badge} /> : name.slice(0, 3).toUpperCase()}
    </span>
  );
}

function Choice({
  label,
  name,
  value,
  defaultChecked
}: {
  label: string;
  name: string;
  value: Pick;
  defaultChecked: boolean;
}) {
  return (
    <label className="choice">
      <input defaultChecked={defaultChecked} name={name} type="radio" value={value} />
      {label}
    </label>
  );
}

function shortName(name: string) {
  return name.length > 12 ? name.slice(0, 12) : name;
}
