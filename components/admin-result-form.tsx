import { Save } from "lucide-react";
import { updateMatchResultAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import type { MatchRow } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export function AdminResultForm({ match }: { match: MatchRow }) {
  return (
    <div className="admin-row">
      <div>
        <div className="title">
          {match.home_team} vs {match.away_team}
        </div>
        <p className="meta">
          <span>{formatDateTime(match.starts_at)}</span>
          <StatusPill status={match.status} />
        </p>
      </div>
      <form action={updateMatchResultAction} className="admin-form">
        <input name="match_id" type="hidden" value={match.id} />
        <div className="field">
          <label htmlFor={`${match.id}-admin-home`}>Home</label>
          <input
            id={`${match.id}-admin-home`}
            min="0"
            name="home_score"
            type="number"
            defaultValue={match.home_score ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor={`${match.id}-admin-away`}>Away</label>
          <input
            id={`${match.id}-admin-away`}
            min="0"
            name="away_score"
            type="number"
            defaultValue={match.away_score ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor={`${match.id}-admin-winner`}>Winner</label>
          <select id={`${match.id}-admin-winner`} name="result_winner" defaultValue={match.result_winner ?? ""}>
            <option value="">Auto</option>
            <option value="home">{match.home_team}</option>
            <option value="draw">Draw</option>
            <option value="away">{match.away_team}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${match.id}-admin-status`}>Status</label>
          <select id={`${match.id}-admin-status`} name="status" defaultValue={match.status}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="LIVE">Live</option>
            <option value="FINISHED">Finished</option>
            <option value="POSTPONED">Postponed</option>
          </select>
        </div>
        <SubmitButton pendingLabel="Saving..." icon={<Save size={17} />}>
          Save
        </SubmitButton>
      </form>
    </div>
  );
}
