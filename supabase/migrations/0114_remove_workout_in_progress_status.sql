-- Workouts no longer use an in_progress status; partial logs stay on scheduled rows.
UPDATE public.client_scheduled_workouts
SET status = 'scheduled'
WHERE status = 'in_progress';
