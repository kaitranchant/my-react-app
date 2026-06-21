-- Portal leaderboards: allow clients to read teammate stats on shared teams (0044)

create or replace function public.is_leaderboard_teammate(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members my_tm
    join public.team_members peer_tm on peer_tm.team_id = my_tm.team_id
    join public.clients me on me.id = my_tm.client_id
    join public.clients peer on peer.id = peer_tm.client_id
    where me.user_id = auth.uid()
      and peer_tm.client_id = target_client_id
      and peer.status = 'active'
      and peer.leaderboard_opt_out = false
      and peer.is_coach_self = false
  );
$$;

drop policy if exists "Clients can view leaderboard teammates" on public.clients;
create policy "Clients can view leaderboard teammates"
  on public.clients for select
  using (public.is_leaderboard_teammate(id));

drop policy if exists "Clients can view teammates on shared teams" on public.team_members;
create policy "Clients can view teammates on shared teams"
  on public.team_members for select
  using (public.is_leaderboard_teammate(client_id));

drop policy if exists "Clients can view teammate pr records" on public.exercise_pr_records;
create policy "Clients can view teammate pr records"
  on public.exercise_pr_records for select
  using (public.is_leaderboard_teammate(client_id));

drop policy if exists "Clients can view teammate scheduled workouts" on public.client_scheduled_workouts;
create policy "Clients can view teammate scheduled workouts"
  on public.client_scheduled_workouts for select
  using (public.is_leaderboard_teammate(client_id));

drop policy if exists "Clients can view teammate workout log sets" on public.workout_log_sets;
create policy "Clients can view teammate workout log sets"
  on public.workout_log_sets for select
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = workout_log_sets.scheduled_workout_id
        and public.is_leaderboard_teammate(csw.client_id)
    )
  );

drop policy if exists "Clients can view exercises for teammate prs" on public.exercises;
create policy "Clients can view exercises for teammate prs"
  on public.exercises for select
  using (
    exists (
      select 1
      from public.exercise_pr_records pr
      where pr.exercise_id = exercises.id
        and public.is_leaderboard_teammate(pr.client_id)
    )
  );
