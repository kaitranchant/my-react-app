-- Session category for coaching appointments (coaching, nutrition, class, etc.)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'coaching_session_type') then
    create type public.coaching_session_type as enum (
      'coaching',
      'nutrition',
      'class',
      'consultation',
      'other'
    );
  end if;
end $$;

alter table public.coaching_appointments
  add column if not exists session_type public.coaching_session_type not null default 'coaching';

comment on column public.coaching_appointments.session_type is
  'Category of session: coaching, nutrition, class, consultation, or other.';
