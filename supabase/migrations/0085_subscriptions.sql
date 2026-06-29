-- Coach and facility subscription plans

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type public.subscription_plan as enum ('starter', 'growth', 'scale', 'facility');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete'
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists subscription_plan public.subscription_plan not null default 'starter';

create table if not exists public.gym_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  plan public.subscription_plan not null default 'facility',
  status public.subscription_status not null default 'active',
  included_coach_seats integer not null default 8,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_subscriptions_gym_id_key unique (gym_id),
  constraint gym_subscriptions_included_coach_seats_check
    check (included_coach_seats >= 1)
);

create index if not exists gym_subscriptions_gym_id_idx
  on public.gym_subscriptions (gym_id);

drop trigger if exists gym_subscriptions_set_updated_at on public.gym_subscriptions;
create trigger gym_subscriptions_set_updated_at
  before update on public.gym_subscriptions
  for each row execute function public.set_updated_at();

alter table public.gym_subscriptions enable row level security;

drop policy if exists "Gym owners can view their gym subscription" on public.gym_subscriptions;
create policy "Gym owners can view their gym subscription"
  on public.gym_subscriptions for select
  to authenticated
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_subscriptions.gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

-- Count billable clients (exclude coach self row)
create or replace function public.coach_billable_client_count(p_coach_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.clients c
  where c.coach_id = p_coach_id
    and coalesce(c.is_coach_self, false) = false
    and c.status <> 'archived';
$$;

grant execute on function public.coach_billable_client_count(uuid) to authenticated;

-- Client limit enforcement in coach_create_client
create or replace function public.coach_create_client(
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_status public.client_status default 'active',
  p_coaching_type public.client_coaching_type default null,
  p_gym_id uuid default null,
  p_goal text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_plan public.subscription_plan;
  v_count integer;
  v_in_paid_facility boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_gym_id is not null and not public.is_gym_member(p_gym_id) then
    raise exception 'You must be a member of the selected gym.';
  end if;

  select p.subscription_plan into v_plan
  from public.profiles p
  where p.id = auth.uid();

  select exists (
    select 1
    from public.gym_members gm
    join public.gym_subscriptions gs on gs.gym_id = gm.gym_id
    where gm.coach_id = auth.uid()
      and gm.status = 'active'
      and gs.status in ('active', 'trialing')
      and gs.plan = 'facility'
  ) into v_in_paid_facility;

  if not v_in_paid_facility then
    v_count := public.coach_billable_client_count(auth.uid());

    if coalesce(v_plan, 'starter') = 'starter' and v_count >= 5 then
      raise exception 'Client limit reached. Upgrade to Growth for more clients.';
    end if;

    if v_plan = 'growth' and v_count >= 25 then
      raise exception 'Client limit reached. Upgrade to Scale for unlimited clients.';
    end if;
  end if;

  insert into public.clients (
    coach_id,
    full_name,
    email,
    phone,
    status,
    coaching_type,
    gym_id,
    goal,
    notes
  )
  values (
    auth.uid(),
    trim(p_full_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    coalesce(p_status, 'active'::public.client_status),
    p_coaching_type,
    p_gym_id,
    nullif(trim(coalesce(p_goal, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_client_id;

  return v_client_id;
end;
$$;
