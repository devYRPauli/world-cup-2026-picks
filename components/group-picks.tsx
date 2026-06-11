import { Lock, Save, Trophy } from "lucide-react";
import { saveGroupPredictionAction } from "@/app/group-picks/actions";
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
      {groups.map((group) => {
        const prediction = predictionsByGroup.get(group.name);

        return (
          <article className="group-card" key={group.name}>
            <div className="group-card-head">
              <div>
                <span className="eyebrow">{group.display_name}</span>
                <h2>Top two</h2>
              </div>
              <span className={`status-pill ${group.is_locked ? "locked" : ""}`}>
                {group.is_locked ? "Locked" : group.starts_at ? `Locks ${formatShortDate(group.starts_at)}` : "Open"}
              </span>
            </div>

            {group.is_locked ? (
              <div className="saved-pick">
                <Lock size={17} />
                {prediction ? (
                  <>
                    {prediction.picked_team_1} and {prediction.picked_team_2}
                    {prediction.is_scored ? ` | ${prediction.points} pts` : ""}
                  </>
                ) : (
                  "No saved top-two pick"
                )}
              </div>
            ) : (
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
                <button className="button primary" type="submit">
                  <Save size={17} />
                  Save
                </button>
              </form>
            )}

            <div className="standings-list">
              {group.standings.map((row, index) => (
                <div className="standing-row" key={row.team}>
                  <span className="rank-badge">{index + 1}</span>
                  <span className="standing-team">
                    {index < 2 && group.is_complete ? <Trophy size={15} /> : null}
                    {row.team}
                  </span>
                  <span>{row.played}</span>
                  <span>{row.goal_difference}</span>
                  <strong>{row.points}</strong>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
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
