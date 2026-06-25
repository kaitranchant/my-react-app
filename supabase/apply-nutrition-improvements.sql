-- Nutrition improvements: apply after 0075_nutrition.sql
-- Paste into Supabase SQL editor or run via supabase db push

alter table public.client_nutrition_profiles
  add column if not exists fiber_g numeric(8, 1)
    check (fiber_g is null or fiber_g > 0),
  add column if not exists water_ml numeric(8, 1)
    check (water_ml is null or water_ml > 0),
  add column if not exists dietary_restrictions text,
  add column if not exists supplements jsonb not null default '[]'::jsonb,
  add column if not exists client_nutrition_notes text;

alter table public.client_nutrition_logs
  add column if not exists fiber_g numeric(8, 1)
    check (fiber_g is null or fiber_g >= 0),
  add column if not exists water_ml numeric(8, 1)
    check (water_ml is null or water_ml >= 0);

create table if not exists public.client_food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  meal_type public.meal_type not null default 'other',
  food_name text not null,
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g >= 0),
  fiber_g numeric(8, 1) check (fiber_g is null or fiber_g >= 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_food_diary_entries_client_date_idx
  on public.client_food_diary_entries (client_id, log_date desc);

alter table public.client_food_diary_entries enable row level security;

-- See migrations/0076_nutrition_improvements.sql for full RLS policies and triggers.
