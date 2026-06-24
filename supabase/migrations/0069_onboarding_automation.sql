-- Onboarding automation: default program + welcome message on invite accept

alter table public.profiles
  add column if not exists default_onboarding_program_id uuid references public.programs (id) on delete set null,
  add column if not exists onboarding_welcome_template_id uuid references public.coach_message_templates (id) on delete set null;

create index if not exists profiles_default_onboarding_program_id_idx
  on public.profiles (default_onboarding_program_id)
  where default_onboarding_program_id is not null;

alter table public.clients
  add column if not exists invite_accepted_at timestamptz,
  add column if not exists onboarding_automation_at timestamptz;

create index if not exists clients_pending_onboarding_automation_idx
  on public.clients (invite_accepted_at)
  where invite_accepted_at is not null and onboarding_automation_at is null;

-- Backfill invite_accepted_at for clients who already accepted
update public.clients
set invite_accepted_at = coalesce(invite_accepted_at, updated_at)
where invite_status = 'accepted'
  and invite_accepted_at is null;

create or replace function public.link_client_invite(
  p_token uuid,
  p_user_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  select *
  into v_client
  from public.clients
  where invite_token = p_token
    and invite_status = 'pending'
    and (invite_expires_at is null or invite_expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if v_client.email is null or lower(trim(v_client.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  update public.clients
  set
    user_id = p_user_id,
    invite_status = 'accepted',
    invite_token = null,
    invite_expires_at = null,
    invite_accepted_at = timezone('utc', now())
  where id = v_client.id;

  update public.profiles
  set
    role = 'client',
    avatar_url = coalesce(v_client.avatar_url, public.profiles.avatar_url)
  where id = p_user_id;

  return v_client.id;
end;
$$;
