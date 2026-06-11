# World Cup 2026 Picks

A self-hostable FIFA World Cup 2026 prediction pool for small groups. Members make picks for each match, picks lock at kickoff, admins enter or sync results, and the leaderboard updates automatically.

World Cup 2026 Picks is built for friendly bragging-rights pools only. It does not include odds, payments, payouts, or real-money wagering.

## Features

- Email/password sign up with optional shared invite code
- FIFA World Cup match import from football-data.org
- Manual result entry fallback for admins
- Pick winner/draw plus optional exact-score bonus
- Pick top two teams from each group for bonus points
- Matchday tabs for group-stage matches
- Automatic scoring and leaderboard
- Supabase Auth/Postgres backend
- Vercel-friendly Next.js app

## Stack

- Next.js app router
- Supabase Auth and Postgres
- Vercel hosting
- football-data.org match sync, with manual result editing as fallback

## Bring your own keys

This repo is safe to make public because it does not include secrets. To run it, each deployment needs its own Supabase project and optional football-data.org API token.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `ADMIN_EMAILS`
   - `POOL_INVITE_CODE` if you want to restrict signup to invited members
   - `FOOTBALL_DATA_TOKEN` if you want automated match imports
   - `CRON_SECRET` if you want scheduled result syncs
5. Install dependencies and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel deployment

1. Import the GitHub repo into Vercel.
2. Add the same environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed site URL.
4. In Supabase Auth settings, add the deployed callback URL:
   `https://your-domain.vercel.app/auth/callback`

## Admin setup

Add your email to `ADMIN_EMAILS`, sign up through the app, then visit `/admin`. The app promotes matching emails to admin on first access.

## Existing database updates

If you already deployed an earlier version, run the newest migration in Supabase SQL editor:

```sql
supabase/migrations/20260611_group_predictions.sql
```

## Invite-only signup

Set `POOL_INVITE_CODE` in Vercel and local env. New members will need that code when they join.

## Scoring

- Correct outcome: 3 points
- Exact score bonus: 2 points
- Correct group qualifier: 5 points per team
- Wrong pick: 0 points

Picks are for fun only. There is no money or wagering logic in the app.

## Automated result sync

The app includes a Vercel Cron Job at `/api/cron/sync-results`. Set `CRON_SECRET` in Vercel, then add the same value as the bearer token when testing the endpoint manually.

The schedule in `vercel.json` runs once per day, which works on Vercel Hobby. For faster updates, use Vercel Pro or an external scheduler that calls the same endpoint with `Authorization: Bearer <CRON_SECRET>`.

## License

MIT
