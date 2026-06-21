-- Portal leaderboards: allow clients to read teammate bodyweight data (0046)
-- Requires migration 0044 (portal leaderboards) first.

drop policy if exists "Clients can view teammate InBody scans for leaderboards" on public.client_inbody_scans;
create policy "Clients can view teammate InBody scans for leaderboards"
  on public.client_inbody_scans for select
  using (public.is_leaderboard_teammate(client_id));

drop policy if exists "Clients can view teammate check-ins for leaderboards" on public.client_check_ins;
create policy "Clients can view teammate check-ins for leaderboards"
  on public.client_check_ins for select
  using (public.is_leaderboard_teammate(client_id));
