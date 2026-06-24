-- Apply scheduling improvements (0074). Safe to run multiple times.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'coaching_appointment_status'
      and e.enumlabel = 'rescheduled'
  ) then
    alter type public.coaching_appointment_status add value 'rescheduled';
  end if;
end
$$;

alter table public.client_session_packs
  add column if not exists price_cents integer;

alter table public.client_session_packs
  drop constraint if exists client_session_packs_price_cents_check;
alter table public.client_session_packs
  add constraint client_session_packs_price_cents_check
  check (price_cents is null or price_cents >= 0);

alter table public.coaching_appointments
  add column if not exists pre_session_notes text,
  add column if not exists post_session_notes text,
  add column if not exists rescheduled_to_id uuid references public.coaching_appointments (id) on delete set null;
