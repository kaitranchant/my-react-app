-- Coach preferences on profiles (weight unit, week start, timezone, check-in cadence)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'weight_unit') then
    create type public.weight_unit as enum ('lbs', 'kg');
  end if;
  if not exists (select 1 from pg_type where typname = 'week_starts_on') then
    create type public.week_starts_on as enum ('sunday', 'monday');
  end if;
  if not exists (select 1 from pg_type where typname = 'check_in_frequency') then
    create type public.check_in_frequency as enum ('daily', 'weekly', 'biweekly');
  end if;
end
$$;

alter table public.profiles
  add column if not exists weight_unit public.weight_unit not null default 'lbs',
  add column if not exists week_starts_on public.week_starts_on not null default 'monday',
  add column if not exists coach_timezone text,
  add column if not exists default_check_in_frequency public.check_in_frequency not null default 'weekly';

alter table public.profiles
  drop constraint if exists profiles_coach_timezone_check;

alter table public.profiles
  add constraint profiles_coach_timezone_check
  check (
    coach_timezone is null
    or coach_timezone in (
      'auto',
      'america_new_york',
      'america_chicago',
      'america_denver',
      'america_los_angeles',
      'europe_london'
    )
  );
