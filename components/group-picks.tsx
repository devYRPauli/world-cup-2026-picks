"use client";

import { useState } from "react";
import { Check, Lock, Pencil, Trophy, X } from "lucide-react";
import { saveGroupPredictionAction } from "@/app/group-picks/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatShortDate } from "@/lib/format";
import type { GroupPredictionRow, GroupView } from "@/lib/types";

export function GroupPicks({
  groups,
  predictionsByGroup,
  available,
  advancedTeams
}: {
  groups: GroupView[];
  predictionsByGroup: Map<string, GroupPredictionRow>;
  available: boolean;
  advancedTeams: string[];
}) {
  if (!available) {
    return (
      <section className="empty-state">
        Group picks need the latest Supabase migration before they can be used.
      </section>
    );
  }

  if (!groups.length) {
    return <section className="empty-state">Sync fixtures to unlock group picks.</section>;
  }

  const advanced = new Set(advancedTeams);

  return (
    <section className="group-grid" aria-label="Group qualification picks">
      {groups.map((group) => (
        <GroupCard
          key={group.name}
          group={group}
          prediction={predictionsByGroup.get(group.name)}
          advanced={advanced}
        />
      ))}
    </section>
  );
}

function GroupCard({
  group,
  prediction,
  advanced
}: {
  group: GroupView;
  prediction?: GroupPredictionRow;
  advanced: Set<string>;
}) {
  const [editing, setEditing] = useState(false);
  const showForm = !group.is_locked && (editing || !prediction);
  // Once the knockout bracket is known we colour teams by who actually advanced;
  // before that, highlight the provisional top two from the live table.
  const bracketKnown = advanced.size > 0;

  const picks = prediction
    ? [prediction.picked_team_1, prediction.picked_team_2, prediction.picked_team_3].filter(
        (team): team is string => Boolean(team)
      )
    : [];

  return (
    <article className="group-card">
      <div className="group-card-head">
        <div>
          <div className="eyebrow">{group.display_name}</div>
          <h2>Reaches the Round of 32</h2>
        </div>
        <span className={`pill ${group.is_locked ? "locked" : "open"}`}>
          {group.is_locked ? "Locked" : group.starts_at ? `Locks ${formatShortDate(group.starts_at)}` : "Open"}
        </span>
      </div>

      {showForm ? (
        <form action={saveGroupPredictionAction} className="group-pick-form">
          <input name="group_name" type="hidden" value={group.name} />
          <p className="pick-hint">Pick the 2 or 3 teams you think advance. +5 pts each.</p>
          <TeamSelect
            groupName={group.name}
            label="Qualifier 1"
            name="picked_team_1"
            teams={group.teams}
            value={prediction?.picked_team_1}
            required
          />
          <TeamSelect
            groupName={group.name}
            label="Qualifier 2"
            name="picked_team_2"
            teams={group.teams}
            value={prediction?.picked_team_2}
            required
          />
          <TeamSelect
            groupName={group.name}
            label="Third-place longshot (optional)"
            name="picked_team_3"
            teams={group.teams}
            value={prediction?.picked_team_3 ?? ""}
          />
          <SubmitButton pendingLabel="Saving…" icon={<Check size={17} />}>
            {prediction ? "Update" : "Save picks"}
          </SubmitButton>
        </form>
      ) : group.is_locked ? (
        <div className="picks-summary locked">
          <div className="picks-summary-head">
            <Lock size={14} /> Your picks
            {prediction?.is_scored ? <span className="pts">+{prediction.points} pts</span> : null}
          </div>
          {picks.length ? (
            <ul className="pick-chips">
              {picks.map((team) => (
                <PickChip key={team} team={team} advanced={advanced} bracketKnown={bracketKnown} />
              ))}
            </ul>
          ) : (
            <span className="muted-line">No picks saved</span>
          )}
        </div>
      ) : (
        <div className="saved">
          <div className="saved-info" style={{ alignItems: "flex-start" }}>
            <span className="check" aria-hidden="true">
              <Check size={18} />
            </span>
            <div>
              <div className="l1">Your picks</div>
              <ul className="pick-chips" style={{ marginTop: 6 }}>
                {picks.map((team) => (
                  <li key={team} className="pick-chip">
                    {team}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button className="btn ghost" type="button" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit
          </button>
        </div>
      )}

      <div className="standings">
        <div className="standing standing-head">
          <span className="pos">#</span>
          <span className="tm">Team</span>
          <span>P</span>
          <span>GD</span>
          <strong>Pts</strong>
        </div>
        {group.standings.map((row, index) => {
          const qualifies = bracketKnown ? advanced.has(row.team) : index < 2;
          return (
            <div className={`standing ${qualifies ? "qualify" : ""}`} key={row.team}>
              <span className="pos">{index + 1}</span>
              <span className="tm">
                {bracketKnown && advanced.has(row.team) ? <Trophy size={14} /> : null}
                {row.team}
              </span>
              <span>{row.played}</span>
              <span>{formatGd(row.goal_difference)}</span>
              <strong>{row.points}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PickChip({
  team,
  advanced,
  bracketKnown
}: {
  team: string;
  advanced: Set<string>;
  bracketKnown: boolean;
}) {
  if (!bracketKnown) {
    return <li className="pick-chip">{team}</li>;
  }

  const made = advanced.has(team);
  return (
    <li className={`pick-chip ${made ? "hit" : "miss"}`}>
      {made ? <Check size={13} /> : <X size={13} />}
      {team}
    </li>
  );
}

function formatGd(gd: number) {
  return gd > 0 ? `+${gd}` : `${gd}`;
}

function TeamSelect({
  groupName,
  label,
  name,
  teams,
  value,
  required
}: {
  groupName: string;
  label: string;
  name: string;
  teams: GroupView["teams"];
  value?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={`${groupName}-${name}`}>{label}</label>
      <select id={`${groupName}-${name}`} name={name} required={required} defaultValue={value ?? ""}>
        <option value="">{required ? "Choose a team" : "Skip"}</option>
        {teams.map((team) => (
          <option key={team.name} value={team.name}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
