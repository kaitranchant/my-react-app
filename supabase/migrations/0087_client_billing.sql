-- Coach-to-client billing via Stripe Connect

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_invoice_status') then
    create type public.client_invoice_status as enum (
      'draft',
      'open',
      'paid',
      'void',
      'uncollectible'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'client_subscription_status') then
    create type public.client_subscription_status as enum (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'client_billing_interval') then
    create type public.client_billing_interval as enum ('month', 'year');
  end if;
end $$;

alter table public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_details_submitted boolean not null default false;

create index if not exists profiles_stripe_connect_account_id_idx
  on public.profiles (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

alter table public.clients
  add column if not exists stripe_customer_id text;

create index if not exists clients_stripe_customer_id_idx
  on public.clients (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.client_invoices (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'usd',
  description text not null,
  status public.client_invoice_status not null default 'draft',
  due_date date,
  stripe_invoice_id text,
  hosted_invoice_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_invoices_amount_cents_check check (amount_cents > 0),
  constraint client_invoices_stripe_invoice_id_key unique (stripe_invoice_id)
);

create index if not exists client_invoices_coach_id_idx
  on public.client_invoices (coach_id);

create index if not exists client_invoices_client_id_idx
  on public.client_invoices (client_id);

create index if not exists client_invoices_status_idx
  on public.client_invoices (coach_id, status);

drop trigger if exists client_invoices_set_updated_at on public.client_invoices;
create trigger client_invoices_set_updated_at
  before update on public.client_invoices
  for each row execute function public.set_updated_at();

create table if not exists public.client_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  amount_cents integer not null,
  interval public.client_billing_interval not null,
  currency text not null default 'usd',
  description text not null,
  status public.client_subscription_status not null default 'incomplete',
  stripe_subscription_id text,
  stripe_price_id text,
  checkout_session_id text,
  checkout_url text,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_billing_subscriptions_amount_cents_check check (amount_cents > 0),
  constraint client_billing_subscriptions_stripe_subscription_id_key
    unique (stripe_subscription_id)
);

create index if not exists client_billing_subscriptions_coach_id_idx
  on public.client_billing_subscriptions (coach_id);

create index if not exists client_billing_subscriptions_client_id_idx
  on public.client_billing_subscriptions (client_id);

create index if not exists client_billing_subscriptions_status_idx
  on public.client_billing_subscriptions (coach_id, status);

drop trigger if exists client_billing_subscriptions_set_updated_at on public.client_billing_subscriptions;
create trigger client_billing_subscriptions_set_updated_at
  before update on public.client_billing_subscriptions
  for each row execute function public.set_updated_at();

alter table public.client_invoices enable row level security;
alter table public.client_billing_subscriptions enable row level security;

drop policy if exists "Coaches manage their client invoices" on public.client_invoices;
create policy "Coaches manage their client invoices"
  on public.client_invoices
  for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "Clients view their invoices" on public.client_invoices;
create policy "Clients view their invoices"
  on public.client_invoices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_invoices.client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches manage client billing subscriptions" on public.client_billing_subscriptions;
create policy "Coaches manage client billing subscriptions"
  on public.client_billing_subscriptions
  for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "Clients view their billing subscriptions" on public.client_billing_subscriptions;
create policy "Clients view their billing subscriptions"
  on public.client_billing_subscriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_billing_subscriptions.client_id
        and c.user_id = auth.uid()
    )
  );
