-- Visual-only status markers for Google Calendar busy blocks on the coach schedule.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'coach_google_event_marker_status'
  ) then
    create type public.coach_google_event_marker_status as enum (
      'completed',
      'cancelled',
      'no_show'
    );
  end if;
end
$$;

create table if not exists public.coach_google_event_markers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  google_event_id text not null,
  status public.coach_google_event_marker_status not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_google_event_markers_event_id_not_blank check (
    char_length(trim(google_event_id)) > 0
  ),
  constraint coach_google_event_markers_coach_event_unique unique (coach_id, google_event_id)
);

create index if not exists coach_google_event_markers_coach_idx
  on public.coach_google_event_markers (coach_id);

drop trigger if exists coach_google_event_markers_set_updated_at
  on public.coach_google_event_markers;
create trigger coach_google_event_markers_set_updated_at
  before update on public.coach_google_event_markers
  for each row execute function public.set_updated_at();

alter table public.coach_google_event_markers enable row level security;

drop policy if exists "Coaches manage their Google event markers"
  on public.coach_google_event_markers;
create policy "Coaches manage their Google event markers"
  on public.coach_google_event_markers
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

comment on table public.coach_google_event_markers is
  'Coach-owned visual status markers for unlinked Google Calendar busy blocks. No appointment side effects.';
