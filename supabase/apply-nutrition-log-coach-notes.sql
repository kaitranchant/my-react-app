-- Per-day coach notes on nutrition adherence logs.
-- Paste into Supabase SQL editor or run via supabase db push (0145).

alter table public.client_nutrition_logs
  add column if not exists coach_notes text;
