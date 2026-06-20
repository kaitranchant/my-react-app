-- Gyms: multi-coach organizations with opt-in shared client access

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'gym_member_role') then
    create type public.gym_member_role as enum ('owner', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'gym_member_status') then
    create type public.gym_member_status as enum ('active', 'pending');
  end if;
  if not exists (select 1 from pg_type where typname = 'gym_invite_status') then
    create type public.gym_invite_status as enum ('pending', 'accepted', 'revoked');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- gyms
-- ---------------------------------------------------------------------------

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists gyms_created_by_idx on public.gyms (created_by);

drop trigger if exists gyms_set_updated_at on public.gyms;
create trigger gyms_set_updated_at
  before update on public.gyms
  for each row execute function public.set_updated_at();

alter table public.gyms enable row level security;

-- ---------------------------------------------------------------------------
-- gym_members
-- ---------------------------------------------------------------------------

create table if not exists public.gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  role public.gym_member_role not null default 'member',
  status public.gym_member_status not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (gym_id, coach_id)
);

create unique index if not exists gym_members_one_active_gym_per_coach_idx
  on public.gym_members (coach_id)
  where status = 'active';

create index if not exists gym_members_gym_id_idx on public.gym_members (gym_id);

alter table public.gym_members enable row level security;

-- ---------------------------------------------------------------------------
-- gym_invites
-- ---------------------------------------------------------------------------

create table if not exists public.gym_invites (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  email text not null,
  invite_token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status public.gym_invite_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists gym_invites_gym_id_idx on public.gym_invites (gym_id);
create index if not exists gym_invites_email_idx on public.gym_invites (lower(email));

alter table public.gym_invites enable row level security;

-- ---------------------------------------------------------------------------
-- clients.gym_id — opt-in sharing with gym peers
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists gym_id uuid references public.gyms (id) on delete set null;

create index if not exists clients_gym_id_idx on public.clients (gym_id)
  where gym_id is not null;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_gym_member(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_members gm
    where gm.gym_id = target_gym_id
      and gm.coach_id = auth.uid()
      and gm.status = 'active'
  );
$$;

create or replace function public.can_coach_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and (
        c.coach_id = auth.uid()
        or (
          c.gym_id is not null
          and public.is_gym_member(c.gym_id)
        )
      )
  );
$$;

create or replace function public.can_coach_access_scheduled_workout(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_scheduled_workouts csw
    where csw.id = target_workout_id
      and public.can_coach_access_client(csw.client_id)
  );
$$;

create or replace function public.is_exercise_on_accessible_client(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.scheduled_workout_exercises swe
    join public.client_scheduled_workouts csw on csw.id = swe.scheduled_workout_id
    where swe.exercise_id = target_exercise_id
      and public.can_coach_access_client(csw.client_id)
  )
  or exists (
    select 1
    from public.program_scheduled_workout_exercises pswe
    join public.program_scheduled_workouts psw on psw.id = pswe.program_scheduled_workout_id
    join public.program_assignments pa on pa.program_id = psw.program_id
    where pswe.exercise_id = target_exercise_id
      and pa.status = 'active'
      and public.can_coach_access_client(pa.client_id)
  );
$$;

create or replace function public.is_workout_on_accessible_client(target_workout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_scheduled_workouts csw
    where csw.library_workout_id = target_workout_id
      and public.can_coach_access_client(csw.client_id)
  );
$$;

create or replace function public.is_program_on_accessible_client(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_assignments pa
    where pa.program_id = target_program_id
      and pa.status = 'active'
      and public.can_coach_access_client(pa.client_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Client sharing guard
-- ---------------------------------------------------------------------------

create or replace function public.clients_gym_share_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from old.coach_id then
    if new.coach_id is distinct from old.coach_id
      or new.gym_id is distinct from old.gym_id
      or new.user_id is distinct from old.user_id
      or new.invite_token is distinct from old.invite_token
      or new.invite_status is distinct from old.invite_status
      or new.invite_expires_at is distinct from old.invite_expires_at
      or new.is_coach_self is distinct from old.is_coach_self
    then
      raise exception 'Only the primary coach can change client ownership or sharing settings';
    end if;
  end if;

  if new.gym_id is distinct from old.gym_id and auth.uid() = old.coach_id then
    if new.gym_id is not null and not public.is_gym_member(new.gym_id) then
      raise exception 'You must be an active member of the gym to share this client';
    end if;
    if old.is_coach_self then
      raise exception 'Coach self profile cannot be shared with a gym';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists clients_gym_share_guard on public.clients;
create trigger clients_gym_share_guard
  before update on public.clients
  for each row execute function public.clients_gym_share_guard();

-- ---------------------------------------------------------------------------
-- Gym invite RPCs
-- ---------------------------------------------------------------------------

create or replace function public.link_gym_invite(
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
  v_invite public.gym_invites%rowtype;
begin
  if exists (
    select 1
    from public.gym_members gm
    where gm.coach_id = p_user_id
      and gm.status = 'active'
  ) then
    raise exception 'You are already a member of a gym';
  end if;

  select *
  into v_invite
  from public.gym_invites
  where invite_token = p_token
    and status = 'pending'
    and (expires_at is null or expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  insert into public.gym_members (gym_id, coach_id, role, status)
  values (v_invite.gym_id, p_user_id, 'member', 'active')
  on conflict (gym_id, coach_id) do update
    set status = 'active',
        role = excluded.role;

  update public.gym_invites
  set status = 'accepted'
  where id = v_invite.id;

  return v_invite.gym_id;
end;
$$;

create or replace function public.get_gym_invite_preview(p_token uuid)
returns table (
  gym_name text,
  inviter_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    g.name as gym_name,
    coalesce(p.full_name, 'A coach') as inviter_name,
    gi.email as email
  from public.gym_invites gi
  join public.gyms g on g.id = gi.gym_id
  join public.profiles p on p.id = gi.invited_by
  where gi.invite_token = p_token
    and gi.status = 'pending'
    and (gi.expires_at is null or gi.expires_at > timezone('utc', now()));
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
  v_gym_token uuid;
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

  begin
    v_gym_token := (new.raw_user_meta_data ->> 'gym_invite_token')::uuid;
  exception
    when invalid_text_representation then
      v_gym_token := null;
  end;

  if v_gym_token is not null and v_role = 'coach' then
    perform public.link_gym_invite(v_gym_token, new.id, new.email);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- gyms RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Gym members can view their gym" on public.gyms;
create policy "Gym members can view their gym"
  on public.gyms for select
  using (
    public.is_gym_member(id)
    or created_by = auth.uid()
  );

drop policy if exists "Coaches can create gyms" on public.gyms;
create policy "Coaches can create gyms"
  on public.gyms for insert
  with check (auth.uid() = created_by);

drop policy if exists "Gym owners can update their gym" on public.gyms;
create policy "Gym owners can update their gym"
  on public.gyms for update
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Gym owners can delete their gym" on public.gyms;
create policy "Gym owners can delete their gym"
  on public.gyms for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- gym_members RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Gym members can view gym roster" on public.gym_members;
create policy "Gym members can view gym roster"
  on public.gym_members for select
  using (public.is_gym_member(gym_id));

drop policy if exists "Gym owners can insert members" on public.gym_members;
create policy "Gym owners can insert members"
  on public.gym_members for insert
  with check (
    coach_id = auth.uid()
    or exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Gym owners can update members" on public.gym_members;
create policy "Gym owners can update members"
  on public.gym_members for update
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Members can leave or owners can remove" on public.gym_members;
create policy "Members can leave or owners can remove"
  on public.gym_members for delete
  using (
    coach_id = auth.uid()
    or exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- gym_invites RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Gym owners can view invites" on public.gym_invites;
create policy "Gym owners can view invites"
  on public.gym_invites for select
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Gym owners can create invites" on public.gym_invites;
create policy "Gym owners can create invites"
  on public.gym_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Gym owners can update invites" on public.gym_invites;
create policy "Gym owners can update invites"
  on public.gym_invites for update
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- clients — gym-aware coach policies
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their clients" on public.clients;
create policy "Coaches can view their clients"
  on public.clients for select
  using (public.can_coach_access_client(id));

drop policy if exists "Coaches can insert their clients" on public.clients;
create policy "Coaches can insert their clients"
  on public.clients for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their clients" on public.clients;
create policy "Coaches can update their clients"
  on public.clients for update
  using (public.can_coach_access_client(id))
  with check (public.can_coach_access_client(id));

drop policy if exists "Coaches can delete their clients" on public.clients;
create policy "Coaches can delete their clients"
  on public.clients for delete
  using (public.can_coach_access_client(id));

-- ---------------------------------------------------------------------------
-- client_scheduled_workouts
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can view their client scheduled workouts"
  on public.client_scheduled_workouts for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can insert their client scheduled workouts"
  on public.client_scheduled_workouts for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can update their client scheduled workouts"
  on public.client_scheduled_workouts for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can delete their client scheduled workouts"
  on public.client_scheduled_workouts for delete
  using (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- scheduled_workout_exercises
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can view scheduled workout exercises"
  on public.scheduled_workout_exercises for select
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can insert scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can insert scheduled workout exercises"
  on public.scheduled_workout_exercises for insert
  with check (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can update scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can update scheduled workout exercises"
  on public.scheduled_workout_exercises for update
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id))
  with check (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can delete scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can delete scheduled workout exercises"
  on public.scheduled_workout_exercises for delete
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id));

-- ---------------------------------------------------------------------------
-- workout_log_sets
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view workout log sets" on public.workout_log_sets;
create policy "Coaches can view workout log sets"
  on public.workout_log_sets for select
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can insert workout log sets" on public.workout_log_sets;
create policy "Coaches can insert workout log sets"
  on public.workout_log_sets for insert
  with check (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can update workout log sets" on public.workout_log_sets;
create policy "Coaches can update workout log sets"
  on public.workout_log_sets for update
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id))
  with check (public.can_coach_access_scheduled_workout(scheduled_workout_id));

drop policy if exists "Coaches can delete workout log sets" on public.workout_log_sets;
create policy "Coaches can delete workout log sets"
  on public.workout_log_sets for delete
  using (public.can_coach_access_scheduled_workout(scheduled_workout_id));

-- ---------------------------------------------------------------------------
-- program_assignments
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their program assignments" on public.program_assignments;
create policy "Coaches can view their program assignments"
  on public.program_assignments for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert their program assignments" on public.program_assignments;
create policy "Coaches can insert their program assignments"
  on public.program_assignments for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update their program assignments" on public.program_assignments;
create policy "Coaches can update their program assignments"
  on public.program_assignments for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete their program assignments" on public.program_assignments;
create policy "Coaches can delete their program assignments"
  on public.program_assignments for delete
  using (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- client_check_ins
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client check-ins" on public.client_check_ins;
create policy "Coaches can view their client check-ins"
  on public.client_check_ins for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client check-ins" on public.client_check_ins;
create policy "Coaches can insert client check-ins"
  on public.client_check_ins for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client check-ins" on public.client_check_ins;
create policy "Coaches can update client check-ins"
  on public.client_check_ins for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client check-ins" on public.client_check_ins;
create policy "Coaches can delete client check-ins"
  on public.client_check_ins for delete
  using (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- client_progress_photos
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client progress photos" on public.client_progress_photos;
create policy "Coaches can view their client progress photos"
  on public.client_progress_photos for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client progress photos" on public.client_progress_photos;
create policy "Coaches can insert client progress photos"
  on public.client_progress_photos for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client progress photos" on public.client_progress_photos;
create policy "Coaches can update client progress photos"
  on public.client_progress_photos for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client progress photos" on public.client_progress_photos;
create policy "Coaches can delete client progress photos"
  on public.client_progress_photos for delete
  using (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- client_inbody_scans
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client InBody scans" on public.client_inbody_scans;
create policy "Coaches can view their client InBody scans"
  on public.client_inbody_scans for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client InBody scans" on public.client_inbody_scans;
create policy "Coaches can insert client InBody scans"
  on public.client_inbody_scans for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client InBody scans" on public.client_inbody_scans;
create policy "Coaches can update client InBody scans"
  on public.client_inbody_scans for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client InBody scans" on public.client_inbody_scans;
create policy "Coaches can delete client InBody scans"
  on public.client_inbody_scans for delete
  using (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- exercise_pr_records
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view exercise pr records" on public.exercise_pr_records;
create policy "Coaches can view exercise pr records"
  on public.exercise_pr_records for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert exercise pr records" on public.exercise_pr_records;
create policy "Coaches can insert exercise pr records"
  on public.exercise_pr_records for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

-- ---------------------------------------------------------------------------
-- client_message_threads
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client message threads" on public.client_message_threads;
create policy "Coaches can view their client message threads"
  on public.client_message_threads for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert their client message threads" on public.client_message_threads;
create policy "Coaches can insert their client message threads"
  on public.client_message_threads for insert
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can update their client message threads" on public.client_message_threads;
create policy "Coaches can update their client message threads"
  on public.client_message_threads for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

-- ---------------------------------------------------------------------------
-- client_messages
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client messages" on public.client_messages;
create policy "Coaches can view their client messages"
  on public.client_messages for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert their client messages" on public.client_messages;
create policy "Coaches can insert their client messages"
  on public.client_messages for insert
  with check (
    public.can_coach_access_client(client_id)
    and sender_id = auth.uid()
    and sender_role = 'coach'
  );

-- ---------------------------------------------------------------------------
-- Contextual library read for gym peers
-- ---------------------------------------------------------------------------

drop policy if exists "Gym coaches can view exercises on accessible client workouts" on public.exercises;
create policy "Gym coaches can view exercises on accessible client workouts"
  on public.exercises for select
  using (public.is_exercise_on_accessible_client(id));

drop policy if exists "Gym coaches can view workouts on accessible client calendars" on public.workouts;
create policy "Gym coaches can view workouts on accessible client calendars"
  on public.workouts for select
  using (public.is_workout_on_accessible_client(id));

drop policy if exists "Gym coaches can view programs on accessible client assignments" on public.programs;
create policy "Gym coaches can view programs on accessible client assignments"
  on public.programs for select
  using (public.is_program_on_accessible_client(id));

-- ---------------------------------------------------------------------------
-- Progress photo storage — gym-aware coach access
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can read client progress photos" on storage.objects;
create policy "Coaches can read client progress photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and public.can_coach_access_client(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Coaches can upload client progress photos" on storage.objects;
create policy "Coaches can upload client progress photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and public.can_coach_access_client(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Coaches can update client progress photos" on storage.objects;
create policy "Coaches can update client progress photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and public.can_coach_access_client(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Coaches can delete client progress photos" on storage.objects;
create policy "Coaches can delete client progress photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and public.can_coach_access_client(((storage.foldername(name))[2])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.is_gym_member(uuid) to authenticated;
grant execute on function public.can_coach_access_client(uuid) to authenticated;
grant execute on function public.get_gym_invite_preview(uuid) to anon, authenticated;
grant execute on function public.link_gym_invite(uuid, uuid, text) to authenticated;
