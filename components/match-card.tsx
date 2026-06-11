"use client";

import { useState } from "react";
import { CalendarDays, Check, Lock, Pencil } from "lucide-react";
import { savePredictionAction } from "@/app/predictions/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime, minutesUntil, toTitleCase } from "@/lib/format";
import { pickLabel } from "@/lib/scoring";
import type { MatchPredictionStats, MatchRow, Pick, PredictionRow } from "@/lib/types";

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
  const [editing, setEditing] = useState(false);

  const hasScore = match.home_score !== null && match.away_score !== null;
  const score = hasScore ? `${match.home_score}–${match.away_score}` : "vs";
  const showForm = !locked && (editing || !prediction);

  return (
    <article className="card">
      <div className="card-top">
        <div className="meta">
          <span>{match.group_name ? toTitleCase(match.group_name) : toTitleCase(match.stage)}</span>
          {match.matchday ? (
            <>
              <span className="dot">•</span>
              <span>Matchday {match.matchday}</span>
            </>
          ) : null}
          <span className="dot">•</span>
          <span>
            <CalendarDays size={13} /> {formatDateTime(match.starts_at)}
          </span>
        </div>
        <StatusPill status={match.status} locked={locked} />
      </div>

      <div className="card-body">
        <div className="teams">
          <TeamBadge name={match.home_team} badge={match.home_badge} />
          <div className="vs">
            <div className="score tnum">{score}</div>
            <div className="lbl">{match.status === "FINISHED" ? "result" : "pick"}</div>
          </div>
          <TeamBadge name={match.away_team} badge={match.away_badge} away />
        </div>

        {showForm ? (
          <form action={savePredictionAction} className="pickform">
            <input name="match_id" type="hidden" value={match.id} />
            <div className="choices" aria-label="Pick outcome">
              <Choice label={match.home_team} value="home" defaultChecked={prediction?.pick === "home"} />
              <Choice label="Draw" value="draw" defaultChecked={prediction?.pick === "draw" || !prediction} />
              <Choice label={match.away_team} value="away" defaultChecked={prediction?.pick === "away"} />
            </div>
            <div className="scorerow">
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
              <SubmitButton pendingLabel="Saving…" icon={<Check size={17} />}>
                {prediction ? "Update" : "Save pick"}
              </SubmitButton>
            </div>
          </form>
        ) : locked ? (
          <div className="lockedrow">
            <Lock size={15} />
            {prediction ? (
              <>
                You picked <b>{pickScoreLabel(prediction, match)}</b>
              </>
            ) : (
              <span>No pick saved</span>
            )}
            {match.status === "FINISHED" && prediction ? (
              <span className="pts">+{prediction.points} pts</span>
            ) : null}
          </div>
        ) : (
          <div className="saved">
            <div className="saved-info">
              <span className="check" aria-hidden="true">
                <Check size={18} />
              </span>
              <div>
                <div className="l1">Your pick · {lockCountdown(match.starts_at)}</div>
                <div className="l2">{prediction ? pickScoreNode(prediction, match) : null}</div>
              </div>
            </div>
            <button className="btn ghost" type="button" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              Edit
            </button>
          </div>
        )}

        {stats && stats.total > 0 ? (
          <PoolSplit stats={stats} match={match} />
        ) : null}
      </div>
    </article>
  );
}

function pickScoreLabel(prediction: PredictionRow, match: MatchRow) {
  const base = pickLabel(prediction.pick, match);
  if (prediction.predicted_home_score !== null && prediction.predicted_away_score !== null) {
    return `${base} · ${prediction.predicted_home_score}–${prediction.predicted_away_score}`;
  }
  return base;
}

function pickScoreNode(prediction: PredictionRow, match: MatchRow) {
  const base = pickLabel(prediction.pick, match);
  const hasScore =
    prediction.predicted_home_score !== null && prediction.predicted_away_score !== null;
  return (
    <>
      <b>{base}</b>
      {hasScore ? ` · ${prediction.predicted_home_score}–${prediction.predicted_away_score}` : ""}
    </>
  );
}

function lockCountdown(startsAt: string) {
  const mins = minutesUntil(startsAt);
  if (mins <= 0) return "locking now";
  if (mins < 60) return `locks in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `locks in ${hours}h`;
  return `locks in ${Math.round(hours / 24)}d`;
}

function PoolSplit({ stats, match }: { stats: MatchPredictionStats; match: MatchRow }) {
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);
  const leader = Math.max(stats.home, stats.draw, stats.away);
  const leaderLabel =
    leader === stats.home ? shortName(match.home_team) : leader === stats.away ? shortName(match.away_team) : "Draw";

  return (
    <div className="split">
      <span>Pool</span>
      <span className="bar" aria-hidden="true">
        <i className="h" style={{ width: `${pct(stats.home)}%` }} />
        <i className="d" style={{ width: `${pct(stats.draw)}%` }} />
        <i className="a" style={{ width: `${pct(stats.away)}%` }} />
      </span>
      <span className="tnum">
        {pct(leader)}% {leaderLabel}
      </span>
    </div>
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
  return <span className="flag">{badge ? <img alt="" src={badge} /> : name.slice(0, 3).toUpperCase()}</span>;
}

function Choice({
  label,
  value,
  defaultChecked
}: {
  label: string;
  value: Pick;
  defaultChecked: boolean;
}) {
  return (
    <label className="choice">
      <input defaultChecked={defaultChecked} name="pick" type="radio" value={value} />
      {label}
    </label>
  );
}

function shortName(name: string) {
  return name.length > 12 ? name.slice(0, 12) : name;
}
