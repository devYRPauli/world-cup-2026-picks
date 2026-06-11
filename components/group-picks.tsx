"use client";

import { useState } from "react";
import { Check, Lock, Pencil, Trophy } from "lucide-react";
import { saveGroupPredictionAction } from "@/app/group-picks/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatShortDate } from "@/lib/format";
import type { GroupPredictionRow, GroupView } from "@/lib/types";

export function GroupPicks({
  groups,
  predictionsByGroup,
  available
}: {
  groups: GroupView[];
  predictionsByGroup: Map<string, GroupPredictionRow>;
  available: boolean;
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

  return (
    <section className="group-grid" aria-label="Group qualification picks">
      {groups.map((group) => (
        <GroupCard key={group.name} group={group} prediction={predictionsByGroup.get(group.name)} />
      ))}
    </section>
  );
}

function GroupCard({ group, prediction }: { group: GroupView; prediction?: GroupPredictionRow }) {
  const [editing, setEditing] = useState(false);
  const showForm = !group.is_locked && (editing || !prediction);

  return (
    <article className="group-card">
      <div className="group-card-head">
        <div>
          <div className="eyebrow">{group.display_name}</div>
          <h2>Top two qualifiers</h2>
        </div>
        <span className={`pill ${group.is_locked ? "locked" : "open"}`}>
          {group.is_locked ? "Locked" : group.starts_at ? `Locks ${formatShortDate(group.starts_at)}` : "Open"}
        </span>
      </div>

      {showForm ? (
        <form action={saveGroupPredictionAction} className="group-pick-form">
          <input name="group_name" type="hidden" value={group.name} />
          <TeamSelect
            groupName={group.name}
            label="First qualifier"
            name="picked_team_1"
            teams={group.teams}
            value={prediction?.picked_team_1}
          />
          <TeamSelect
            groupName={group.name}
            label="Second qualifier"
            name="picked_team_2"
            teams={group.teams}
            value={prediction?.picked_team_2}
          />
          <SubmitButton pendingLabel="Saving…" icon={<Check size={17} />}>
            {prediction ? "Update" : "Save picks"}
          </SubmitButton>
        </form>
      ) : group.is_locked ? (
        <div className="lockedrow">
          <Lock size={15} />
          {prediction ? (
            <>
              You picked <b>{prediction.picked_team_1}</b> &amp; <b>{prediction.picked_team_2}</b>
            </>
          ) : (
            <span>No picks saved</span>
          )}
          {prediction?.is_scored ? <span className="pts">+{prediction.points} pts</span> : null}
        </div>
      ) : (
        <div className="saved">
          <div className="saved-info">
            <span className="check" aria-hidden="true">
              <Check size={18} />
            </span>
            <div>
              <div className="l1">Your qualifiers</div>
              <div className="l2">
                <b>{prediction?.picked_team_1}</b> &amp; <b>{prediction?.picked_team_2}</b>
              </div>
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
          const qualifies = index < 2;
          return (
            <div className={`standing ${qualifies ? "qualify" : ""}`} key={row.team}>
              <span className="pos">{index + 1}</span>
              <span className="tm">
                {qualifies && group.is_complete ? <Trophy size={14} /> : null}
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

function formatGd(gd: number) {
  return gd > 0 ? `+${gd}` : `${gd}`;
}

function TeamSelect({
  groupName,
  label,
  name,
  teams,
  value
}: {
  groupName: string;
  label: string;
  name: string;
  teams: GroupView["teams"];
  value?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={`${groupName}-${name}`}>{label}</label>
      <select id={`${groupName}-${name}`} name={name} required defaultValue={value ?? ""}>
        <option value="" disabled>
          Choose a team
        </option>
        {teams.map((team) => (
          <option key={team.name} value={team.name}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
