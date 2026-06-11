-- Add an optional third group pick (the "best third-placed team" longshot).
-- Up to three teams from a group can reach the new 2026 Round of 32:
-- the top two plus, for 8 of the 12 groups, the third-placed team.

alter table public.group_predictions
  add column if not exists picked_team_3 text;

alter table public.group_predictions
  drop constraint if exists group_predictions_team3_distinct;

alter table public.group_predictions
  add constraint group_predictions_team3_distinct
  check (
    picked_team_3 is null
    or (picked_team_3 <> picked_team_1 and picked_team_3 <> picked_team_2)
  );

-- Recreate the write policies so the optional third pick is validated too.
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
