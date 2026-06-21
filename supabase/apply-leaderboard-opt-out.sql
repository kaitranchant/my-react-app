-- Client privacy toggle for leaderboard visibility (0043)
alter table public.clients
  add column if not exists leaderboard_opt_out boolean not null default false;

comment on column public.clients.leaderboard_opt_out is
  'When true, the client is excluded from coach and portal leaderboards.';
