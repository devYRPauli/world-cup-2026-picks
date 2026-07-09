# World Cup 2026 Picks

A self-hostable World Cup 2026 prediction pool for small groups. Members pick match outcomes, add an optional exact-score guess for bragging rights, choose group-stage qualifiers, and compete on a live leaderboard.

Live instance: https://world-cup-2026-picks.vercel.app (invite-only pool; deploy your own with the steps below).

This is built for friendly bragging rights only. It does not include odds, payments, payouts, or real-money wagering.

## Features

- Email and password signup with an optional shared invite code
- Member profile setup with display names and generated colors
- Admin promotion from configured email addresses
- Fixture and result import from football-data.org
- Manual result editing for admins when the API is late or unavailable
- Matchday tabs for group-stage matches that flip to round tabs (Round of 32, Round of 16, and so on) once the group stage finishes
- Open matches surface first per matchday, locked and finished ones collapse, and a counter shows how many still need a pick
- Client-side tab switching after the dashboard loads
- Optimistic pick saving with no full-page refresh
- Match picks that lock at kickoff
- Group qualifier picks that lock at the first match in that group
- Optional third group pick for the 2026 Round of 32 format
- Winner-only knockout picks from the Round of 32 onward (no draw option), scored like any other match pick
- Match and group scoring computed live from results, never stored
- Leaderboard views: total points, standardized accuracy (correct picks over all decided games), and a knockout-only board (Round of 32 onward) with per-round filters
- Pool split bars on each match card showing how members picked
- Member profiles (click a leaderboard row) with current streak, best streak, and exact-scoreline count
- Live dashboard data read fresh on every request
- Light and dark themes with a responsive mobile nav
- Vercel Cron result sync at 9:00 AM Eastern time

## Stack

- Next.js App Router
- Supabase Auth and Postgres
- Vercel hosting
- football-data.org for match and result sync
- TypeScript

## How It Works

1. Members join with email and password.
2. If `POOL_INVITE_CODE` is set, signup requires that code.
3. Admins sync fixtures from `/admin` after setting `FOOTBALL_DATA_TOKEN`.
4. Members save match picks and group qualifier picks.
5. Picks lock automatically when the relevant match or group starts.
6. Results are imported by cron or updated manually by an admin.
7. The leaderboard updates automatically: scores are computed on read from the stored match results, so there is nothing to recalculate.

The public repo does not contain secrets. Every deployment needs its own Supabase project, Supabase keys, and optional football-data.org token.

## Scoring

- Correct match outcome: 3 points
- Predicted scoreline: optional and worth no points, kept only as an "exact scorelines" bragging stat
- Knockout pick (Round of 32 onward): pick the winner only, 3 points if correct (extra time and penalties decide the result, so there is no draw option)
- Group qualifier hit: 5 points per picked team that reaches the Round of 32
- Wrong match pick: 0 points
- Wrong group qualifier pick: 0 points

Leaderboard ties sort by total points, then correct match picks, then display name.

The leaderboard has three views. **Points** is the full total (match picks, group qualifiers, and knockout). **Accuracy** is standardized as correct picks over every decided game in the pool, not just the games a member chose to bet on, so skipping a game counts against accuracy the same as a wrong pick. **Knockout** ranks by knockout points only, counting Round of 32 picks onward, and can be filtered to a single round from the Round of 32 through the final.

Scores are computed on read from the stored match results (only finished matches count), so a scoring change takes effect immediately - there is nothing to recalculate.

## 2026 Group Bonus

The 2026 tournament has 12 groups of four. The top two teams from each group and the eight best third-placed teams reach the Round of 32.

For each group, members must pick two teams and may pick a third team. The third pick is useful because some third-placed teams advance.

The app does not try to reimplement every official third-place tiebreaker. Instead, group bonus scoring is finalized after the synced knockout fixtures contain 32 real Round of 32 teams. This keeps the scoring aligned with the resolved tournament bracket.

## Data Model

- `profiles`: member profile, role, display name, and avatar color
- `matches`: synced or manually edited fixtures and results
- `predictions`: one match pick per member per match
- `group_predictions`: one group qualifier pick set per member per group

Row Level Security is enabled. Members can read shared match data, update their own profile, and write only their own unlocked picks. Admin-only operations use the Supabase secret key on the server.

## Local setup

Requirements:

- Node.js 20 or newer
- A Supabase project
- A football-data.org token if you want API sync

Create a Supabase project, then run `supabase/schema.sql` in the Supabase SQL editor.

Copy `.env.example` to `.env.local` and fill in the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
FOOTBALL_DATA_TOKEN=
CRON_SECRET=
ADMIN_EMAILS=
POOL_INVITE_CODE=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

`NEXT_PUBLIC_SUPABASE_URL` is your Supabase project URL.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the browser-safe Supabase publishable key.

`SUPABASE_SECRET_KEY` is the privileged server key. Keep it in local and Vercel environment variables only.

`FOOTBALL_DATA_TOKEN` is optional but required for fixture and result sync.

`CRON_SECRET` protects the cron endpoint.

`ADMIN_EMAILS` is a comma-separated list of emails that should become admins after signup.

`POOL_INVITE_CODE` is optional. If set, new members must enter it when joining.

`NEXT_PUBLIC_SITE_URL` should be the local or deployed site URL.

## Supabase Auth Settings

For the simplest private-pool flow, disable email confirmation in Supabase Auth settings. If email confirmation stays enabled, users must confirm email before they can sign in.

Add these redirect URLs in Supabase Auth:

```text
http://localhost:3000/auth/callback
https://your-domain.vercel.app/auth/callback
```

## Vercel deployment

1. Import the GitHub repo into Vercel.
2. Add the same environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed site URL, for example `https://your-domain.vercel.app`.
4. Add the deployed callback URL in Supabase Auth settings.
5. Redeploy after changing environment variables.

## Admin setup

Add your email to `ADMIN_EMAILS`, sign up through the app, then visit `/admin`. The app promotes matching emails to admin on first access.

Admins can:

- Sync fixtures and results from football-data.org
- Edit match status, scores, and winners manually

## Automated Result Sync

The app includes a Vercel Cron Job at `/api/cron/sync-results`.

`vercel.json` uses this schedule:

```json
{
  "path": "/api/cron/sync-results",
  "schedule": "0 13 * * *"
}
```

That is 9:00 AM Eastern time during the World Cup. Vercel cron schedules are written in UTC.

For manual testing:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/sync-results
```

The endpoint imports current fixtures and results into the `matches` table. Scoring is computed on read from those results, so no recalculation step is needed.

## Existing database updates

If you already deployed an earlier version, keep your existing data and run the migrations in Supabase SQL editor:

```sql
-- Run the contents of these files:
-- supabase/migrations/20260611_group_predictions.sql
-- supabase/migrations/20260612_group_third_pick.sql
```

These migrations add group picks and the optional third group pick. They do not delete existing profiles, matches, or match predictions.

## Development Checks

Run TypeScript checks before opening a PR or deploying:

```bash
npm run typecheck
```

## Notes For Public Forks

- Do not commit `.env.local`, `.vercel`, or other local secret files.
- Keep `SUPABASE_SECRET_KEY`, `FOOTBALL_DATA_TOKEN`, and `CRON_SECRET` server-side only.
- Use your own Supabase project and football-data.org token.
- The package is marked `private` to prevent accidental npm publishing. The GitHub repo can still be public.

## License

MIT

## Disclaimer

This project is an independent fan-made prediction pool. It is not affiliated with FIFA, Vercel, Supabase, or football-data.org.
