create table if not exists public.group_predictions (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  picked_team_1 text not null,
  picked_team_2 text not null,
  points integer not null default 0,
  is_scored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (picked_team_1 <> picked_team_2),
  unique (group_name, user_id)
);

create index if not exists group_predictions_user_id_idx on public.group_predictions(user_id);
create index if not exists group_predictions_group_name_idx on public.group_predictions(group_name);

drop trigger if exists group_predictions_set_updated_at on public.group_predictions;
create trigger group_predictions_set_updated_at
before update on public.group_predictions
for each row execute function public.set_updated_at();

alter table public.group_predictions enable row level security;

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
    select min(m.starts_at) from public.matches m
    where m.group_name = group_predictions.group_name
  ) > now()
);
