-- Client goals v2: performance, habit, milestone types + target dates
-- Run in Supabase Dashboard → SQL after apply-client-goals.sql

-- Extend category enum (safe if already applied)
alter type public.client_goal_category add value if not exists 'performance';
alter type public.client_goal_category add value if not exists 'habit';
alter type public.client_goal_category add value if not exists 'milestone';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_performance_metric') then
    create type public.client_goal_performance_metric as enum (
      'weight', 'reps', 'e1rm', 'time_seconds', 'powerlifting_total'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_habit_source') then
    create type public.client_goal_habit_source as enum (
      'workouts_per_week', 'check_in_submitted', 'nutrition_adherence'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_habit_period') then
    create type public.client_goal_habit_period as enum ('week');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_milestone_type') then
    create type public.client_goal_milestone_type as enum (
      'session_count', 'program_completion', 'training_streak_days'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_progress_source') then
    create type public.client_goal_progress_source as enum (
      'inbody', 'check_in', 'prefer_inbody'
    );
  end if;
end $$;

alter table public.client_goals
  add column if not exists target_date date,
  add column if not exists exercise_id uuid references public.exercises (id) on delete set null,
  add column if not exists performance_metric public.client_goal_performance_metric,
  add column if not exists habit_source public.client_goal_habit_source,
  add column if not exists habit_frequency smallint,
  add column if not exists habit_period public.client_goal_habit_period,
  add column if not exists milestone_type public.client_goal_milestone_type,
  add column if not exists milestone_target_count integer,
  add column if not exists program_id uuid references public.programs (id) on delete set null,
  add column if not exists progress_source public.client_goal_progress_source,
  add column if not exists metadata jsonb;

create index if not exists client_goals_exercise_id_idx on public.client_goals (exercise_id);
create index if not exists client_goals_program_id_idx on public.client_goals (program_id);

alter table public.client_goals drop constraint if exists client_goals_composition_fields;
alter table public.client_goals drop constraint if exists client_goals_category_fields;

-- Compare category as text so new enum labels added above are valid in the same
-- transaction (PostgreSQL 55P04 otherwise blocks category = 'performance', etc.).
alter table public.client_goals add constraint client_goals_category_fields check (
  (
    category::text = 'composition'
    and metric is not null and direction is not null
    and target_amount is not null and target_amount > 0 and unit is not null
    and target_value is null and comparison is null
    and exercise_id is null and performance_metric is null
    and habit_source is null and habit_frequency is null and habit_period is null
    and milestone_type is null and milestone_target_count is null
  )
  or (
    category::text = 'daily'
    and title is not null and trim(title) <> ''
    and target_value is not null and target_value > 0
    and comparison is not null and unit is not null and trim(unit) <> ''
    and metric is null and direction is null and target_amount is null
    and exercise_id is null and performance_metric is null
    and habit_source is null and habit_frequency is null and habit_period is null
    and milestone_type is null and milestone_target_count is null
  )
  or (
    category::text = 'performance'
    and performance_metric is not null
    and target_value is not null and target_value > 0
    and comparison is not null and unit is not null and trim(unit) <> ''
    and metric is null and direction is null and target_amount is null
    and habit_source is null and habit_frequency is null and habit_period is null
    and milestone_type is null and milestone_target_count is null
    and (performance_metric = 'powerlifting_total' or exercise_id is not null)
  )
  or (
    category::text = 'habit'
    and habit_source is not null and habit_frequency is not null and habit_frequency > 0
    and habit_period is not null
    and metric is null and direction is null and target_amount is null
    and exercise_id is null and performance_metric is null
    and milestone_type is null and milestone_target_count is null
    and (habit_source <> 'nutrition_adherence' or (target_value is not null and target_value > 0))
  )
  or (
    category::text = 'milestone'
    and milestone_type is not null
    and milestone_target_count is not null and milestone_target_count > 0
    and metric is null and direction is null and target_amount is null
    and exercise_id is null and performance_metric is null
    and habit_source is null and habit_frequency is null and habit_period is null
    and (milestone_type <> 'program_completion' or program_id is not null)
  )
);
