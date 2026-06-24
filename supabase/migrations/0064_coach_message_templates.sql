-- Saved message templates for coaches

create table if not exists public.coach_message_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_message_templates_name_length check (char_length(name) between 1 and 120),
  constraint coach_message_templates_body_length check (char_length(body) between 1 and 4000)
);

create index if not exists coach_message_templates_coach_id_idx
  on public.coach_message_templates (coach_id);

drop trigger if exists coach_message_templates_set_updated_at on public.coach_message_templates;
create trigger coach_message_templates_set_updated_at
  before update on public.coach_message_templates
  for each row execute function public.set_updated_at();

alter table public.coach_message_templates enable row level security;

drop policy if exists "Coaches can view their message templates" on public.coach_message_templates;
create policy "Coaches can view their message templates"
  on public.coach_message_templates for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their message templates" on public.coach_message_templates;
create policy "Coaches can insert their message templates"
  on public.coach_message_templates for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their message templates" on public.coach_message_templates;
create policy "Coaches can update their message templates"
  on public.coach_message_templates for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their message templates" on public.coach_message_templates;
create policy "Coaches can delete their message templates"
  on public.coach_message_templates for delete
  using (auth.uid() = coach_id);
