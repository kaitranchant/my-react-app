-- Teams: opt-in gym sharing (migration 0041)
-- Run in Supabase Dashboard → SQL after migrations through 0040

alter table public.teams
  add column if not exists gym_id uuid references public.gyms (id) on delete set null;

create index if not exists teams_gym_id_idx on public.teams (gym_id)
  where gym_id is not null;

create or replace function public.can_coach_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = target_team_id
      and (
        t.coach_id = auth.uid()
        or (
          t.gym_id is not null
          and public.is_gym_member(t.gym_id)
        )
      )
  );
$$;

create or replace function public.can_coach_access_team_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_events e
    where e.id = target_event_id
      and public.can_coach_access_team(e.team_id)
  );
$$;

create or replace function public.teams_gym_share_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from old.coach_id then
    if new.coach_id is distinct from old.coach_id
      or new.gym_id is distinct from old.gym_id
    then
      raise exception 'Only the primary coach can change team ownership or sharing settings';
    end if;
  end if;

  if new.gym_id is distinct from old.gym_id and auth.uid() = old.coach_id then
    if new.gym_id is not null and not public.is_gym_member(new.gym_id) then
      raise exception 'You must be an active member of the gym to share this team';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists teams_gym_share_guard on public.teams;
create trigger teams_gym_share_guard
  before update on public.teams
  for each row execute function public.teams_gym_share_guard();

drop policy if exists "Coaches can view their teams" on public.teams;
create policy "Coaches can view their teams"
  on public.teams for select
  using (public.can_coach_access_team(id));

drop policy if exists "Coaches can insert their teams" on public.teams;
create policy "Coaches can insert their teams"
  on public.teams for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their teams" on public.teams;
create policy "Coaches can update their teams"
  on public.teams for update
  using (public.can_coach_access_team(id))
  with check (public.can_coach_access_team(id));

drop policy if exists "Coaches can delete their teams" on public.teams;
create policy "Coaches can delete their teams"
  on public.teams for delete
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can view their team members" on public.team_members;
create policy "Coaches can view their team members"
  on public.team_members for select
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can insert their team members" on public.team_members;
create policy "Coaches can insert their team members"
  on public.team_members for insert
  with check (
    public.can_coach_access_team(team_id)
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can delete their team members" on public.team_members;
create policy "Coaches can delete their team members"
  on public.team_members for delete
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can view their team announcements" on public.team_announcements;
create policy "Coaches can view their team announcements"
  on public.team_announcements for select
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can insert their team announcements" on public.team_announcements;
create policy "Coaches can insert their team announcements"
  on public.team_announcements for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can update their team announcements" on public.team_announcements;
create policy "Coaches can update their team announcements"
  on public.team_announcements for update
  using (public.can_coach_access_team(team_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can delete their team announcements" on public.team_announcements;
create policy "Coaches can delete their team announcements"
  on public.team_announcements for delete
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can view their team events" on public.team_events;
create policy "Coaches can view their team events"
  on public.team_events for select
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can insert their team events" on public.team_events;
create policy "Coaches can insert their team events"
  on public.team_events for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can update their team events" on public.team_events;
create policy "Coaches can update their team events"
  on public.team_events for update
  using (public.can_coach_access_team(team_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can delete their team events" on public.team_events;
create policy "Coaches can delete their team events"
  on public.team_events for delete
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can view team event member status" on public.team_event_member_status;
create policy "Coaches can view team event member status"
  on public.team_event_member_status for select
  using (public.can_coach_access_team_event(event_id));

drop policy if exists "Coaches can insert team event member status" on public.team_event_member_status;
create policy "Coaches can insert team event member status"
  on public.team_event_member_status for insert
  with check (
    public.can_coach_access_team_event(event_id)
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update team event member status" on public.team_event_member_status;
create policy "Coaches can update team event member status"
  on public.team_event_member_status for update
  using (public.can_coach_access_team_event(event_id))
  with check (public.can_coach_access_team_event(event_id));

drop policy if exists "Coaches can delete team event member status" on public.team_event_member_status;
create policy "Coaches can delete team event member status"
  on public.team_event_member_status for delete
  using (public.can_coach_access_team_event(event_id));

grant execute on function public.can_coach_access_team(uuid) to authenticated;
grant execute on function public.can_coach_access_team_event(uuid) to authenticated;

comment on column public.teams.gym_id is
  'When set, gym peer coaches can view and manage this team.';
