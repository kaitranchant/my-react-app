-- Persist coach dismissals for dashboard proactive alerts.
-- signature lets the same alert reappear when the underlying condition changes.

create table if not exists public.coach_proactive_alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  alert_id text not null,
  kind text not null
    check (kind in ('inactive', 'acwr', 'injury', 'check_in')),
  client_id uuid references public.clients (id) on delete cascade,
  signature text not null,
  dismissed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint coach_proactive_alert_dismissals_coach_alert_unique
    unique (coach_id, alert_id),
  constraint coach_proactive_alert_dismissals_alert_id_nonempty
    check (char_length(trim(alert_id)) > 0),
  constraint coach_proactive_alert_dismissals_signature_nonempty
    check (char_length(trim(signature)) > 0)
);

create index if not exists coach_proactive_alert_dismissals_coach_id_idx
  on public.coach_proactive_alert_dismissals (coach_id);

create index if not exists coach_proactive_alert_dismissals_client_id_idx
  on public.coach_proactive_alert_dismissals (client_id);

alter table public.coach_proactive_alert_dismissals enable row level security;

drop policy if exists "Coaches can view their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals;
create policy "Coaches can view their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals;
create policy "Coaches can insert their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals for insert
  with check (
    auth.uid() = coach_id
    and (
      client_id is null
      or public.can_coach_access_client(client_id)
    )
  );

drop policy if exists "Coaches can update their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals;
create policy "Coaches can update their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals for update
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and (
      client_id is null
      or public.can_coach_access_client(client_id)
    )
  );

drop policy if exists "Coaches can delete their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals;
create policy "Coaches can delete their proactive alert dismissals"
  on public.coach_proactive_alert_dismissals for delete
  using (auth.uid() = coach_id);
