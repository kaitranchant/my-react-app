-- Coach personal tasks / to-dos on the scheduling page

do $$
begin
  if not exists (select 1 from pg_type where typname = 'coach_task_priority') then
    create type public.coach_task_priority as enum ('low', 'normal', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'coach_task_status') then
    create type public.coach_task_status as enum ('pending', 'completed');
  end if;
end
$$;

create table if not exists public.coach_tasks (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  details text,
  due_date date,
  priority public.coach_task_priority not null default 'normal',
  status public.coach_task_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_tasks_title_not_blank check (char_length(trim(title)) > 0),
  constraint coach_tasks_details_length check (
    details is null or char_length(details) <= 2000
  )
);

create index if not exists coach_tasks_coach_status_due_idx
  on public.coach_tasks (coach_id, status, due_date nulls last);

create index if not exists coach_tasks_coach_client_idx
  on public.coach_tasks (coach_id, client_id)
  where client_id is not null;

drop trigger if exists coach_tasks_set_updated_at on public.coach_tasks;
create trigger coach_tasks_set_updated_at
  before update on public.coach_tasks
  for each row execute function public.set_updated_at();

alter table public.coach_tasks enable row level security;

drop policy if exists "Coaches manage their tasks" on public.coach_tasks;
create policy "Coaches manage their tasks"
  on public.coach_tasks
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

comment on table public.coach_tasks is
  'Personal coach to-dos with optional due dates and client links.';
