-- Reusable coach-owned assessment templates

create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assessment_templates_name_not_blank check (trim(name) <> '')
);

create index if not exists assessment_templates_coach_name_idx
  on public.assessment_templates (coach_id, name);

drop trigger if exists assessment_templates_set_updated_at
  on public.assessment_templates;
create trigger assessment_templates_set_updated_at
  before update on public.assessment_templates
  for each row execute function public.set_updated_at();

alter table public.assessment_templates enable row level security;

create policy "Coaches can view their assessment templates"
  on public.assessment_templates for select
  to authenticated
  using (coach_id = auth.uid());

create policy "Coaches can insert their assessment templates"
  on public.assessment_templates for insert
  to authenticated
  with check (coach_id = auth.uid());

create policy "Coaches can update their assessment templates"
  on public.assessment_templates for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coaches can delete their assessment templates"
  on public.assessment_templates for delete
  to authenticated
  using (coach_id = auth.uid());

create table if not exists public.assessment_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates (id) on delete cascade,
  assessment_item_id uuid not null references public.assessment_items (id) on delete cascade,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint assessment_template_items_unique_item
    unique (template_id, assessment_item_id),
  constraint assessment_template_items_unique_order
    unique (template_id, sort_order)
);

create index if not exists assessment_template_items_template_idx
  on public.assessment_template_items (template_id, sort_order);

alter table public.assessment_template_items enable row level security;

create policy "Coaches can view their assessment template items"
  on public.assessment_template_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.assessment_templates template
      where template.id = template_id
        and template.coach_id = auth.uid()
    )
  );

create policy "Coaches can insert their assessment template items"
  on public.assessment_template_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.assessment_templates template
      where template.id = template_id
        and template.coach_id = auth.uid()
    )
    and exists (
      select 1
      from public.assessment_items item
      where item.id = assessment_item_id
        and item.is_active
        and (item.coach_id is null or item.coach_id = auth.uid())
    )
  );

create policy "Coaches can update their assessment template items"
  on public.assessment_template_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.assessment_templates template
      where template.id = template_id
        and template.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.assessment_templates template
      where template.id = template_id
        and template.coach_id = auth.uid()
    )
    and exists (
      select 1
      from public.assessment_items item
      where item.id = assessment_item_id
        and item.is_active
        and (item.coach_id is null or item.coach_id = auth.uid())
    )
  );

create policy "Coaches can delete their assessment template items"
  on public.assessment_template_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.assessment_templates template
      where template.id = template_id
        and template.coach_id = auth.uid()
    )
  );

comment on table public.assessment_templates is
  'Coach-owned reusable groups of assessment tests.';
comment on table public.assessment_template_items is
  'Ordered assessment catalog items included in a reusable template.';
