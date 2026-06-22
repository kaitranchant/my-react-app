-- OAuth tokens for wearable connections (0052)

create table if not exists public.client_wearable_connection_secrets (
  connection_id uuid primary key references public.client_wearable_connections (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists client_wearable_connection_secrets_set_updated_at
  on public.client_wearable_connection_secrets;
create trigger client_wearable_connection_secrets_set_updated_at
  before update on public.client_wearable_connection_secrets
  for each row execute function public.set_updated_at();

alter table public.client_wearable_connection_secrets enable row level security;
