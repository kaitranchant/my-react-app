-- Client portal RLS for teams: read announcements/events, RSVP to events.
-- Run if /portal/team fails with permission errors after teams migrations exist.

-- ---------------------------------------------------------------------------
-- Helpers to avoid RLS policy recursion
-- ---------------------------------------------------------------------------

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.clients c on c.id = tm.client_id
    where tm.team_id = target_team_id
      and c.user_id = auth.uid()
  );
$$;

create or replace function public.team_event_member_status_client_guard()
returns trigger
language plpgsql
as $$
declare
  is_client_actor boolean;
begin
  select exists (
    select 1
    from public.clients c
    where c.user_id = auth.uid()
      and c.id = coalesce(new.client_id, old.client_id)
  ) into is_client_actor;

  if not is_client_actor then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.attendance_status := null;
  elsif tg_op = 'UPDATE' then
    new.attendance_status := old.attendance_status;
  end if;

  return new;
end;
$$;

drop trigger if exists team_event_member_status_client_guard on public.team_event_member_status;
create trigger team_event_member_status_client_guard
  before insert or update on public.team_event_member_status
  for each row execute function public.team_event_member_status_client_guard();

drop policy if exists "Clients can view their teams" on public.teams;
create policy "Clients can view their teams"
  on public.teams for select
  using (
    public.is_team_member(teams.id)
  );

drop policy if exists "Clients can view their team memberships" on public.team_members;
create policy "Clients can view their team memberships"
  on public.team_members for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can view their team announcements" on public.team_announcements;
create policy "Clients can view their team announcements"
  on public.team_announcements for select
  using (
    public.is_team_member(team_id)
  );

drop policy if exists "Clients can view their team events" on public.team_events;
create policy "Clients can view their team events"
  on public.team_events for select
  using (
    public.is_team_member(team_id)
  );

drop policy if exists "Clients can view their team event status" on public.team_event_member_status;
create policy "Clients can view their team event status"
  on public.team_event_member_status for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their team event RSVP" on public.team_event_member_status;
create policy "Clients can insert their team event RSVP"
  on public.team_event_member_status for insert
  with check (
    exists (
      select 1
      from public.clients c
      join public.team_members tm on tm.client_id = c.id
      join public.team_events e on e.id = event_id
      where c.user_id = auth.uid()
        and c.id = client_id
        and tm.team_id = e.team_id
    )
  );

drop policy if exists "Clients can update their team event RSVP" on public.team_event_member_status;
create policy "Clients can update their team event RSVP"
  on public.team_event_member_status for update
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      join public.team_members tm on tm.client_id = c.id
      join public.team_events e on e.id = event_id
      where c.user_id = auth.uid()
        and c.id = client_id
        and tm.team_id = e.team_id
    )
  );
