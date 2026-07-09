-- Allow multiple scheduled workouts on the same calendar day per client.
alter table public.client_scheduled_workouts
  drop constraint if exists client_scheduled_workouts_client_date_key;
