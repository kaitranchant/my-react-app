-- Exercise block / section type for scheduled workout exercises

alter table public.scheduled_workout_exercises
  add column if not exists exercise_block text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scheduled_workout_exercises_exercise_block_check'
  ) then
    alter table public.scheduled_workout_exercises
      add constraint scheduled_workout_exercises_exercise_block_check
      check (
        exercise_block is null
        or exercise_block in (
          'warmup',
          'activation',
          'main_lift',
          'accessory',
          'core',
          'conditioning',
          'cooldown',
          'mobility',
          'finisher'
        )
      );
  end if;
end
$$;
