-- Link form review submissions to workout logging context (0049)

alter table public.client_form_reviews
  add column if not exists scheduled_workout_id uuid references public.client_scheduled_workouts (id) on delete set null,
  add column if not exists scheduled_exercise_id uuid references public.scheduled_workout_exercises (id) on delete set null;

create index if not exists client_form_reviews_scheduled_workout_id_idx
  on public.client_form_reviews (scheduled_workout_id)
  where scheduled_workout_id is not null;

create index if not exists client_form_reviews_scheduled_exercise_id_idx
  on public.client_form_reviews (scheduled_exercise_id)
  where scheduled_exercise_id is not null;

comment on column public.client_form_reviews.scheduled_workout_id is
  'Workout session the client was logging when this form video was submitted.';
comment on column public.client_form_reviews.scheduled_exercise_id is
  'Scheduled exercise row the form video was submitted from during workout logging.';
