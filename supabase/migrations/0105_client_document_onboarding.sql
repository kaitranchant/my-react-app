-- Client document onboarding: coach PDF templates + signing packets

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'onboarding_document_type') then
    create type public.onboarding_document_type as enum ('par_q', 'liability', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'onboarding_delivery_method') then
    create type public.onboarding_delivery_method as enum ('email', 'in_person');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_signing_status') then
    create type public.document_signing_status as enum ('pending', 'signed');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Coach notification preference
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists coach_send_client_onboarding_documents boolean not null default true;

-- ---------------------------------------------------------------------------
-- coach_onboarding_documents
-- ---------------------------------------------------------------------------

create table if not exists public.coach_onboarding_documents (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  document_type public.onboarding_document_type not null default 'other',
  storage_path text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists coach_onboarding_documents_coach_id_idx
  on public.coach_onboarding_documents (coach_id);

alter table public.coach_onboarding_documents enable row level security;

drop policy if exists "Coaches manage their onboarding documents" on public.coach_onboarding_documents;
create policy "Coaches manage their onboarding documents"
  on public.coach_onboarding_documents
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- client_onboarding_packets
-- ---------------------------------------------------------------------------

create table if not exists public.client_onboarding_packets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  sign_token uuid unique,
  sign_expires_at timestamptz,
  delivery_method public.onboarding_delivery_method not null,
  signer_email text,
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists client_onboarding_packets_client_id_idx
  on public.client_onboarding_packets (client_id);
create index if not exists client_onboarding_packets_coach_id_idx
  on public.client_onboarding_packets (coach_id);
create index if not exists client_onboarding_packets_sign_token_idx
  on public.client_onboarding_packets (sign_token)
  where sign_token is not null;

alter table public.client_onboarding_packets enable row level security;

drop policy if exists "Coaches manage their client onboarding packets" on public.client_onboarding_packets;
create policy "Coaches manage their client onboarding packets"
  on public.client_onboarding_packets
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- client_document_signing_requests
-- ---------------------------------------------------------------------------

create table if not exists public.client_document_signing_requests (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.client_onboarding_packets (id) on delete cascade,
  document_id uuid not null references public.coach_onboarding_documents (id) on delete restrict,
  status public.document_signing_status not null default 'pending',
  sort_order integer not null default 0,
  signer_name text,
  signed_at timestamptz,
  signed_pdf_storage_path text,
  signature_image_path text
);

create index if not exists client_document_signing_requests_packet_id_idx
  on public.client_document_signing_requests (packet_id);
create index if not exists client_document_signing_requests_document_id_idx
  on public.client_document_signing_requests (document_id);

alter table public.client_document_signing_requests enable row level security;

drop policy if exists "Coaches view their document signing requests" on public.client_document_signing_requests;
create policy "Coaches view their document signing requests"
  on public.client_document_signing_requests
  for select
  using (
    exists (
      select 1
      from public.client_onboarding_packets p
      where p.id = packet_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches insert their document signing requests" on public.client_document_signing_requests;
create policy "Coaches insert their document signing requests"
  on public.client_document_signing_requests
  for insert
  with check (
    exists (
      select 1
      from public.client_onboarding_packets p
      where p.id = packet_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches update their document signing requests" on public.client_document_signing_requests;
create policy "Coaches update their document signing requests"
  on public.client_document_signing_requests
  for update
  using (
    exists (
      select 1
      from public.client_onboarding_packets p
      where p.id = packet_id
        and p.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.client_onboarding_packets p
      where p.id = packet_id
        and p.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches delete their document signing requests" on public.client_document_signing_requests;
create policy "Coaches delete their document signing requests"
  on public.client_document_signing_requests
  for delete
  using (
    exists (
      select 1
      from public.client_onboarding_packets p
      where p.id = packet_id
        and p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Public preview for signing page
-- ---------------------------------------------------------------------------

create or replace function public.get_onboarding_sign_preview(p_token uuid)
returns table (
  packet_id uuid,
  client_id uuid,
  client_name text,
  coach_name text,
  signer_email text,
  delivery_method public.onboarding_delivery_method,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id as packet_id,
    p.client_id,
    c.full_name as client_name,
    coalesce(pr.full_name, 'Your coach') as coach_name,
    p.signer_email,
    p.delivery_method,
    p.sign_expires_at as expires_at
  from public.client_onboarding_packets p
  join public.clients c on c.id = p.client_id
  join public.profiles pr on pr.id = p.coach_id
  where p.sign_token = p_token
    and p.completed_at is null
    and (p.sign_expires_at is null or p.sign_expires_at > timezone('utc', now()));
end;
$$;

create or replace function public.get_onboarding_sign_documents(p_token uuid)
returns table (
  request_id uuid,
  document_name text,
  document_type public.onboarding_document_type,
  sort_order integer,
  status public.document_signing_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id as request_id,
    d.name as document_name,
    d.document_type,
    r.sort_order,
    r.status
  from public.client_onboarding_packets p
  join public.client_document_signing_requests r on r.packet_id = p.id
  join public.coach_onboarding_documents d on d.id = r.document_id
  where p.sign_token = p_token
    and p.completed_at is null
    and (p.sign_expires_at is null or p.sign_expires_at > timezone('utc', now()))
  order by r.sort_order asc, r.id asc;
end;
$$;

grant execute on function public.get_onboarding_sign_preview(uuid) to anon, authenticated;
grant execute on function public.get_onboarding_sign_documents(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket: private onboarding documents
-- Path formats:
--   coaches/{coach_id}/templates/{doc_id}.pdf
--   clients/{client_id}/signed/{request_id}.pdf
--   clients/{client_id}/signatures/{request_id}.png
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onboarding-documents',
  'onboarding-documents',
  false,
  10485760,
  array['application/pdf', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coaches read onboarding documents" on storage.objects;
create policy "Coaches read onboarding documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'onboarding-documents'
    and (
      (
        (storage.foldername(name))[1] = 'coaches'
        and (storage.foldername(name))[2]::uuid = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'clients'
        and exists (
          select 1
          from public.clients c
          where c.id::text = (storage.foldername(name))[2]
            and c.coach_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Coaches upload onboarding documents" on storage.objects;
create policy "Coaches upload onboarding documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'onboarding-documents'
    and (
      (
        (storage.foldername(name))[1] = 'coaches'
        and (storage.foldername(name))[2]::uuid = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'clients'
        and exists (
          select 1
          from public.clients c
          where c.id::text = (storage.foldername(name))[2]
            and c.coach_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Coaches update onboarding documents" on storage.objects;
create policy "Coaches update onboarding documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'onboarding-documents'
    and (
      (
        (storage.foldername(name))[1] = 'coaches'
        and (storage.foldername(name))[2]::uuid = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'clients'
        and exists (
          select 1
          from public.clients c
          where c.id::text = (storage.foldername(name))[2]
            and c.coach_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Coaches delete onboarding documents" on storage.objects;
create policy "Coaches delete onboarding documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'onboarding-documents'
    and (
      (
        (storage.foldername(name))[1] = 'coaches'
        and (storage.foldername(name))[2]::uuid = auth.uid()
      )
      or (
        (storage.foldername(name))[1] = 'clients'
        and exists (
          select 1
          from public.clients c
          where c.id::text = (storage.foldername(name))[2]
            and c.coach_id = auth.uid()
        )
      )
    )
  );

comment on table public.coach_onboarding_documents is
  'Coach-uploaded PDF templates for client onboarding (PAR-Q, liability, etc.).';
comment on table public.client_onboarding_packets is
  'A batch of documents sent to a client for signing via email or in person.';
comment on table public.client_document_signing_requests is
  'Individual document signing status within an onboarding packet.';
