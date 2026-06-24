-- Scheduling UX improvements: session notes, pack pricing, rescheduled status

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

comment on column public.client_session_packs.price_cents is
  'Amount paid for the pack in cents (optional, for coach records).';
comment on column public.coaching_appointments.pre_session_notes is
  'Coach planning notes before the session.';
comment on column public.coaching_appointments.post_session_notes is
  'Coach review notes after the session.';
