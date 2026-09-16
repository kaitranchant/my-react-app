-- Per-day coach notes on nutrition adherence logs (separate from client_notes).

alter table public.client_nutrition_logs
  add column if not exists coach_notes text;
