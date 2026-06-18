-- DEPRECATED — this file only covers migrations 0002–0007 (partial schema).
-- Do NOT use for new setups. Prefer:
--   CLI:  npx supabase login && yarn db:link && yarn db:push
--   Or run individual scripts listed in readme.md (0008–0014):
--     apply-client-calendar.sql, apply-exercise-details.sql, apply-exercise-block.sql,
--     apply-workout-logging.sql, apply-program-calendar.sql,
--     apply-program-workout-exercises.sql, apply-client-portal.sql
-- Verify with: yarn db:check
--
-- Legacy partial apply (0002–0007). Safe to re-run: uses IF NOT EXISTS where possible.

-- 0002_client_accounts.sql
-- Client accounts: link clients to auth users via coach invites

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('coach', 'client');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_invite_status') then
    create type public.client_invite_status as enum ('not_invited', 'pending', 'accepted');
  end if;
end
$$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'coach';

alter table public.clients
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists invite_status public.client_invite_status not null default 'not_invited',
  add column if not exists invite_token uuid unique,
  add column if not exists invite_expires_at timestamptz;

create unique index if not exists clients_user_id_unique_idx
  on public.clients (user_id)
  where user_id is not null;

create index if not exists clients_invite_token_idx
  on public.clients (invite_token)
  where invite_token is not null;

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
    invite_expires_at = null
  where id = v_client.id;

  update public.profiles
  set
    role = 'client',
    avatar_url = coalesce(v_client.avatar_url, public.profiles.avatar_url)
  where id = p_user_id;

  return v_client.id;
end;
$$;

create or replace function public.get_client_invite_preview(p_token uuid)
returns table (
  client_name text,
  coach_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    c.full_name as client_name,
    coalesce(p.full_name, 'Your coach') as coach_name,
    c.email as email
  from public.clients c
  join public.profiles p on p.id = c.coach_id
  where c.invite_token = p_token
    and c.invite_status = 'pending'
    and (c.invite_expires_at is null or c.invite_expires_at > timezone('utc', now()));
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_token uuid;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'coach'::public.user_role);

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = excluded.role;

  begin
    v_token := (new.raw_user_meta_data ->> 'invite_token')::uuid;
  exception
    when invalid_text_representation then
      v_token := null;
  end;

  if v_token is not null then
    perform public.link_client_invite(v_token, new.id, new.email);
  end if;

  return new;
end;
$$;

drop policy if exists "Clients can view their own record" on public.clients;
create policy "Clients can view their own record"
  on public.clients for select
  using (auth.uid() = user_id);

grant execute on function public.get_client_invite_preview(uuid) to anon, authenticated;
grant execute on function public.link_client_invite(uuid, uuid, text) to authenticated;

-- 0003_client_avatars.sql

alter table public.clients
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  102400,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Coaches can upload client avatars" on storage.objects;
create policy "Coaches can upload client avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update client avatars" on storage.objects;
create policy "Coaches can update client avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can upload their own avatar" on storage.objects;
create policy "Clients can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their own avatar" on storage.objects;
create policy "Clients can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their own record" on public.clients;
create policy "Clients can update their own record"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 0005_programs.sql
-- Programs: coach-owned templates and client assignments

do $$
begin
  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type public.program_status as enum ('draft', 'active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_assignment_status') then
    create type public.program_assignment_status as enum ('active', 'completed', 'cancelled');
  end if;
end
$$;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status public.program_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists programs_coach_id_idx on public.programs (coach_id);
create index if not exists programs_status_idx on public.programs (status);

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;

drop policy if exists "Coaches can view their programs" on public.programs;
create policy "Coaches can view their programs"
  on public.programs for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their programs" on public.programs;
create policy "Coaches can insert their programs"
  on public.programs for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their programs" on public.programs;
create policy "Coaches can update their programs"
  on public.programs for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their programs" on public.programs;
create policy "Coaches can delete their programs"
  on public.programs for delete
  using (auth.uid() = coach_id);

create table if not exists public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  status public.program_assignment_status not null default 'active',
  start_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists program_assignments_coach_id_idx
  on public.program_assignments (coach_id);
create index if not exists program_assignments_client_id_idx
  on public.program_assignments (client_id);
create index if not exists program_assignments_program_id_idx
  on public.program_assignments (program_id);

create unique index if not exists program_assignments_active_client_idx
  on public.program_assignments (client_id)
  where status = 'active';

drop trigger if exists program_assignments_set_updated_at on public.program_assignments;
create trigger program_assignments_set_updated_at
  before update on public.program_assignments
  for each row execute function public.set_updated_at();

alter table public.program_assignments enable row level security;

drop policy if exists "Coaches can view their program assignments" on public.program_assignments;
create policy "Coaches can view their program assignments"
  on public.program_assignments for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their program assignments" on public.program_assignments;
create policy "Coaches can insert their program assignments"
  on public.program_assignments for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their program assignments" on public.program_assignments;
create policy "Coaches can update their program assignments"
  on public.program_assignments for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their program assignments" on public.program_assignments;
create policy "Coaches can delete their program assignments"
  on public.program_assignments for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their program assignments" on public.program_assignments;
create policy "Clients can view their program assignments"
  on public.program_assignments for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can view assigned programs" on public.programs;
create policy "Clients can view assigned programs"
  on public.programs for select
  using (
    exists (
      select 1
      from public.program_assignments pa
      join public.clients c on c.id = pa.client_id
      where pa.program_id = programs.id
        and c.user_id = auth.uid()
        and pa.status = 'active'
    )
  );

-- 0006_library.sql

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_status') then
    create type public.exercise_status as enum ('active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'workout_status') then
    create type public.workout_status as enum ('draft', 'active', 'archived');
  end if;
end
$$;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  instructions text,
  muscle_group text,
  equipment text,
  status public.exercise_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists exercises_coach_id_idx on public.exercises (coach_id);
create index if not exists exercises_status_idx on public.exercises (status);
create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

drop policy if exists "Coaches can view their exercises" on public.exercises;
create policy "Coaches can view their exercises"
  on public.exercises for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their exercises" on public.exercises;
create policy "Coaches can insert their exercises"
  on public.exercises for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their exercises" on public.exercises;
create policy "Coaches can update their exercises"
  on public.exercises for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their exercises" on public.exercises;
create policy "Coaches can delete their exercises"
  on public.exercises for delete
  using (auth.uid() = coach_id);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status public.workout_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workouts_coach_id_idx on public.workouts (coach_id);
create index if not exists workouts_status_idx on public.workouts (status);

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

alter table public.workouts enable row level security;

drop policy if exists "Coaches can view their workouts" on public.workouts;
create policy "Coaches can view their workouts"
  on public.workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their workouts" on public.workouts;
create policy "Coaches can insert their workouts"
  on public.workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their workouts" on public.workouts;
create policy "Coaches can update their workouts"
  on public.workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their workouts" on public.workouts;
create policy "Coaches can delete their workouts"
  on public.workouts for delete
  using (auth.uid() = coach_id);

-- 0007_exercisedb_import.sql

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_source') then
    create type public.exercise_source as enum ('custom', 'exercisedb');
  end if;
end
$$;

alter table public.exercises
  add column if not exists source public.exercise_source not null default 'custom',
  add column if not exists external_id text,
  add column if not exists image_url text,
  add column if not exists difficulty text,
  add column if not exists category text;

create unique index if not exists exercises_coach_external_id_idx
  on public.exercises (coach_id, external_id)
  where external_id is not null;

create index if not exists exercises_source_idx on public.exercises (source);
