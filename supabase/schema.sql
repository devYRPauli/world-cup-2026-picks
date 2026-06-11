create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Member',
  role text not null default 'member' check (role in ('member', 'admin')),
  avatar_color text not null default '#16a34a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  competition text not null default 'FIFA World Cup 2026',
  stage text,
  group_name text,
  matchday integer,
  home_team text not null,
  away_team text not null,
  home_badge text,
  away_badge text,
  starts_at timestamptz not null,
  venue text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED')),
  home_score integer,
  away_score integer,
  result_winner text check (result_winner in ('home', 'away', 'draw')),
  source text not null default 'manual',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pick text not null check (pick in ('home', 'away', 'draw')),
  predicted_home_score integer check (predicted_home_score is null or predicted_home_score >= 0),
  predicted_away_score integer check (predicted_away_score is null or predicted_away_score >= 0),
  points integer not null default 0,
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create table if not exists public.group_predictions (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  picked_team_1 text not null,
  picked_team_2 text not null,
  picked_team_3 text,
  points integer not null default 0,
  is_scored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (picked_team_1 <> picked_team_2),
  check (
    picked_team_3 is null
    or (picked_team_3 <> picked_team_1 and picked_team_3 <> picked_team_2)
  ),
  unique (group_name, user_id)
);

create index if not exists matches_starts_at_idx on public.matches(starts_at);
create index if not exists predictions_user_id_idx on public.predictions(user_id);
create index if not exists predictions_match_id_idx on public.predictions(match_id);
create index if not exists group_predictions_user_id_idx on public.group_predictions(user_id);
create index if not exists group_predictions_group_name_idx on public.group_predictions(group_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

drop trigger if exists group_predictions_set_updated_at on public.group_predictions;
create trigger group_predictions_set_updated_at
before update on public.group_predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.group_predictions enable row level security;

drop policy if exists "Profiles are visible to signed-in members" on public.profiles;
create policy "Profiles are visible to signed-in members"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Members can update their profile" on public.profiles;
create policy "Members can update their profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = 'member');

drop policy if exists "Matches are visible to signed-in members" on public.matches;
create policy "Matches are visible to signed-in members"
on public.matches for select
to authenticated
using (true);

drop policy if exists "Members can read own predictions" on public.predictions;
create policy "Members can read own predictions"
on public.predictions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members can create own unlocked predictions" on public.predictions;
create policy "Members can create own unlocked predictions"
on public.predictions for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and m.status = 'SCHEDULED'
      and m.starts_at > now()
  )
);

drop policy if exists "Members can update own unlocked predictions" on public.predictions;
create policy "Members can update own unlocked predictions"
on public.predictions for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and m.status = 'SCHEDULED'
      and m.starts_at > now()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and m.status = 'SCHEDULED'
      and m.starts_at > now()
  )
);

drop policy if exists "Members can read own group predictions" on public.group_predictions;
create policy "Members can read own group predictions"
on public.group_predictions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Members can create own unlocked group predictions" on public.group_predictions;
create policy "Members can create own unlocked group predictions"
on public.group_predictions for insert
to authenticated
with check (
  auth.uid() = user_id
  and picked_team_1 <> picked_team_2
  and (
    picked_team_3 is null
    or (picked_team_3 <> picked_team_1 and picked_team_3 <> picked_team_2)
  )
  and exists (
    select 1 from public.matches m
    where m.group_name = group_predictions.group_name
      and (m.home_team = picked_team_1 or m.away_team = picked_team_1)
  )
  and exists (
    select 1 from public.matches m
    where m.group_name = group_predictions.group_name
      and (m.home_team = picked_team_2 or m.away_team = picked_team_2)
  )
  and (
    picked_team_3 is null
    or exists (
      select 1 from public.matches m
      where m.group_name = group_predictions.group_name
        and (m.home_team = picked_team_3 or m.away_team = picked_team_3)
    )
  )
  and (
    select min(m.starts_at) from public.matches m
    where m.group_name = group_predictions.group_name
  ) > now()
);

drop policy if exists "Members can update own unlocked group predictions" on public.group_predictions;
create policy "Members can update own unlocked group predictions"
on public.group_predictions for update
to authenticated
using (
  auth.uid() = user_id
  and (
    select min(m.starts_at) from public.matches m
    where m.group_name = group_predictions.group_name
  ) > now()
)
with check (
  auth.uid() = user_id
  and picked_team_1 <> picked_team_2
  and (
    picked_team_3 is null
    or (picked_team_3 <> picked_team_1 and picked_team_3 <> picked_team_2)
  )
  and exists (
    select 1 from public.matches m
    where m.group_name = group_predictions.group_name
      and (m.home_team = picked_team_1 or m.away_team = picked_team_1)
  )
  and exists (
    select 1 from public.matches m
    where m.group_name = group_predictions.group_name
      and (m.home_team = picked_team_2 or m.away_team = picked_team_2)
  )
  and (
    picked_team_3 is null
    or exists (
      select 1 from public.matches m
      where m.group_name = group_predictions.group_name
        and (m.home_team = picked_team_3 or m.away_team = picked_team_3)
    )
  )
  and (
    select min(m.starts_at) from public.matches m
    where m.group_name = group_predictions.group_name
  ) > now()
);
