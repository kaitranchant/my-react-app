-- Structured client assessments: catalog, dated sessions, results, and media

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assessment_item_category') then
    create type public.assessment_item_category as enum (
      'mobility',
      'posture',
      'strength',
      'cardiovascular',
      'power',
      'body_composition',
      'health_intake',
      'custom'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assessment_rubric_type') then
    create type public.assessment_rubric_type as enum (
      'scale',
      'pass_fail',
      'measurement',
      'notes'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- assessment_items (system catalog + coach-owned custom items)
-- ---------------------------------------------------------------------------

create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles (id) on delete cascade,
  slug text,
  name text not null,
  category public.assessment_item_category not null,
  instructions text,
  rubric_type public.assessment_rubric_type not null,
  rubric_config jsonb not null default '{}'::jsonb,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assessment_items_system_or_coach check (
    (coach_id is null and slug is not null)
    or (coach_id is not null and slug is null)
  ),
  constraint assessment_items_name_not_blank check (trim(name) <> ''),
  constraint assessment_items_rubric_config_object check (jsonb_typeof(rubric_config) = 'object')
);

create unique index if not exists assessment_items_system_slug_unique_idx
  on public.assessment_items (slug)
  where coach_id is null and slug is not null;

create index if not exists assessment_items_coach_id_idx
  on public.assessment_items (coach_id);

create index if not exists assessment_items_category_sort_idx
  on public.assessment_items (category, sort_order, name);

drop trigger if exists assessment_items_set_updated_at on public.assessment_items;
create trigger assessment_items_set_updated_at
  before update on public.assessment_items
  for each row execute function public.set_updated_at();

alter table public.assessment_items enable row level security;

drop policy if exists "Anyone authenticated can view system assessment items" on public.assessment_items;
create policy "Anyone authenticated can view system assessment items"
  on public.assessment_items for select
  to authenticated
  using (coach_id is null or coach_id = auth.uid());

drop policy if exists "Coaches can insert their assessment items" on public.assessment_items;
create policy "Coaches can insert their assessment items"
  on public.assessment_items for insert
  to authenticated
  with check (coach_id = auth.uid());

drop policy if exists "Coaches can update their assessment items" on public.assessment_items;
create policy "Coaches can update their assessment items"
  on public.assessment_items for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "Coaches can delete their assessment items" on public.assessment_items;
create policy "Coaches can delete their assessment items"
  on public.assessment_items for delete
  to authenticated
  using (coach_id = auth.uid());

comment on table public.assessment_items is
  'System and coach-owned assessment movement/test definitions with configurable rubrics.';

-- ---------------------------------------------------------------------------
-- client_assessments (dated sessions)
-- ---------------------------------------------------------------------------

create table if not exists public.client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  assessed_at timestamptz not null default timezone('utc', now()),
  overall_notes text,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_assessments_source_allowed check (
    source in ('manual', 'onboarding', 'legacy_import')
  )
);

create index if not exists client_assessments_client_id_idx
  on public.client_assessments (client_id);

create index if not exists client_assessments_coach_id_idx
  on public.client_assessments (coach_id);

create index if not exists client_assessments_client_assessed_at_idx
  on public.client_assessments (client_id, assessed_at desc);

drop trigger if exists client_assessments_set_updated_at on public.client_assessments;
create trigger client_assessments_set_updated_at
  before update on public.client_assessments
  for each row execute function public.set_updated_at();

alter table public.client_assessments enable row level security;

drop policy if exists "Coaches can view client assessments" on public.client_assessments;
create policy "Coaches can view client assessments"
  on public.client_assessments for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client assessments" on public.client_assessments;
create policy "Coaches can insert client assessments"
  on public.client_assessments for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client assessments" on public.client_assessments;
create policy "Coaches can update client assessments"
  on public.client_assessments for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client assessments" on public.client_assessments;
create policy "Coaches can delete client assessments"
  on public.client_assessments for delete
  using (public.can_coach_access_client(client_id));

drop policy if exists "Clients can view their assessments" on public.client_assessments;
create policy "Clients can view their assessments"
  on public.client_assessments for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_assessments is
  'Dated assessment sessions for a client, supporting re-tests and progress deltas.';

-- ---------------------------------------------------------------------------
-- client_assessment_results (selected items within a session)
-- ---------------------------------------------------------------------------

create table if not exists public.client_assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.client_assessments (id) on delete cascade,
  assessment_item_id uuid references public.assessment_items (id) on delete set null,
  item_name text not null,
  item_category public.assessment_item_category not null,
  rubric_type public.assessment_rubric_type not null,
  rubric_config jsonb not null default '{}'::jsonb,
  scale_score numeric(6, 2),
  pass_fail boolean,
  measurement_value numeric(12, 4),
  measurement_unit text,
  notes text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_assessment_results_name_not_blank check (trim(item_name) <> ''),
  constraint client_assessment_results_rubric_config_object check (
    jsonb_typeof(rubric_config) = 'object'
  ),
  constraint client_assessment_results_score_shape check (
    (
      rubric_type = 'scale'
      and scale_score is not null
      and pass_fail is null
      and measurement_value is null
    )
    or (
      rubric_type = 'pass_fail'
      and pass_fail is not null
      and scale_score is null
      and measurement_value is null
    )
    or (
      rubric_type = 'measurement'
      and measurement_value is not null
      and scale_score is null
      and pass_fail is null
    )
    or (
      rubric_type = 'notes'
      and scale_score is null
      and pass_fail is null
      and measurement_value is null
    )
  )
);

create index if not exists client_assessment_results_assessment_id_idx
  on public.client_assessment_results (assessment_id, sort_order);

create index if not exists client_assessment_results_item_id_idx
  on public.client_assessment_results (assessment_item_id);

drop trigger if exists client_assessment_results_set_updated_at on public.client_assessment_results;
create trigger client_assessment_results_set_updated_at
  before update on public.client_assessment_results
  for each row execute function public.set_updated_at();

alter table public.client_assessment_results enable row level security;

drop policy if exists "Coaches can view client assessment results" on public.client_assessment_results;
create policy "Coaches can view client assessment results"
  on public.client_assessment_results for select
  using (
    exists (
      select 1
      from public.client_assessments a
      where a.id = assessment_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can insert client assessment results" on public.client_assessment_results;
create policy "Coaches can insert client assessment results"
  on public.client_assessment_results for insert
  with check (
    exists (
      select 1
      from public.client_assessments a
      where a.id = assessment_id
        and a.coach_id = auth.uid()
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can update client assessment results" on public.client_assessment_results;
create policy "Coaches can update client assessment results"
  on public.client_assessment_results for update
  using (
    exists (
      select 1
      from public.client_assessments a
      where a.id = assessment_id
        and public.can_coach_access_client(a.client_id)
    )
  )
  with check (
    exists (
      select 1
      from public.client_assessments a
      where a.id = assessment_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can delete client assessment results" on public.client_assessment_results;
create policy "Coaches can delete client assessment results"
  on public.client_assessment_results for delete
  using (
    exists (
      select 1
      from public.client_assessments a
      where a.id = assessment_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Clients can view their assessment results" on public.client_assessment_results;
create policy "Clients can view their assessment results"
  on public.client_assessment_results for select
  using (
    exists (
      select 1
      from public.client_assessments a
      join public.clients c on c.id = a.client_id
      where a.id = assessment_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_assessment_results is
  'Per-item scores and notes within a client assessment session, with rubric snapshots.';

-- ---------------------------------------------------------------------------
-- client_assessment_media
-- ---------------------------------------------------------------------------

create table if not exists public.client_assessment_media (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.client_assessment_results (id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  file_size_bytes integer,
  file_name text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint client_assessment_media_content_type_allowed check (
    content_type in (
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'image/jpeg',
      'image/png',
      'image/webp'
    )
  )
);

create index if not exists client_assessment_media_result_id_idx
  on public.client_assessment_media (result_id, sort_order);

alter table public.client_assessment_media enable row level security;

drop policy if exists "Coaches can view client assessment media" on public.client_assessment_media;
create policy "Coaches can view client assessment media"
  on public.client_assessment_media for select
  using (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      where r.id = result_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can insert client assessment media" on public.client_assessment_media;
create policy "Coaches can insert client assessment media"
  on public.client_assessment_media for insert
  with check (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      where r.id = result_id
        and a.coach_id = auth.uid()
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can update client assessment media" on public.client_assessment_media;
create policy "Coaches can update client assessment media"
  on public.client_assessment_media for update
  using (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      where r.id = result_id
        and public.can_coach_access_client(a.client_id)
    )
  )
  with check (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      where r.id = result_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Coaches can delete client assessment media" on public.client_assessment_media;
create policy "Coaches can delete client assessment media"
  on public.client_assessment_media for delete
  using (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      where r.id = result_id
        and public.can_coach_access_client(a.client_id)
    )
  );

drop policy if exists "Clients can view their assessment media" on public.client_assessment_media;
create policy "Clients can view their assessment media"
  on public.client_assessment_media for select
  using (
    exists (
      select 1
      from public.client_assessment_results r
      join public.client_assessments a on a.id = r.assessment_id
      join public.clients c on c.id = a.client_id
      where r.id = result_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_assessment_media is
  'Photo and video attachments for individual assessment results.';

-- ---------------------------------------------------------------------------
-- Storage bucket: private assessment media
-- Path format: clients/{client_id}/{assessment_id}/{result_id}/{media_id}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assessment-media',
  'assessment-media',
  false,
  52428800,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coaches can read assessment media" on storage.objects;
create policy "Coaches can read assessment media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assessment-media'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Clients can read their assessment media" on storage.objects;
create policy "Clients can read their assessment media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'assessment-media'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can upload assessment media" on storage.objects;
create policy "Coaches can upload assessment media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'assessment-media'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Coaches can update assessment media" on storage.objects;
create policy "Coaches can update assessment media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'assessment-media'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Coaches can delete assessment media" on storage.objects;
create policy "Coaches can delete assessment media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'assessment-media'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and public.can_coach_access_client(c.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Seed system assessment catalog
-- ---------------------------------------------------------------------------

insert into public.assessment_items (
  slug, name, category, instructions, rubric_type, rubric_config, sort_order
)
select v.slug, v.name, v.category::public.assessment_item_category, v.instructions,
       v.rubric_type::public.assessment_rubric_type, v.rubric_config::jsonb, v.sort_order
from (
  values
    -- Mobility / FMS
    ('overhead-squat', 'Overhead squat', 'mobility',
     'Anchor movement for the mobility screen. Score using the FMS 0–3 rubric.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 10),
    ('single-leg-squat-step-down', 'Single-leg squat / step-down', 'mobility',
     'Reveal hip/knee control and left-right asymmetry.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 20),
    ('hurdle-step', 'Hurdle step', 'mobility',
     'Hip flexion and stability under a stride pattern.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 30),
    ('in-line-lunge', 'In-line lunge', 'mobility',
     'Trunk stability and hip mobility in a split stance.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 40),
    ('shoulder-mobility', 'Shoulder mobility screen', 'mobility',
     'Hands behind back; measure fist distance between hands.',
     'measurement', '{"unit":"fists","higherIsBetter":false}', 50),
    ('active-straight-leg-raise', 'Active straight-leg raise', 'mobility',
     'Hamstring length and core control.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 60),
    ('trunk-stability-push-up', 'Trunk stability push-up', 'mobility',
     'Core stability during upper-body pressing.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 70),
    ('rotary-stability', 'Rotary stability', 'mobility',
     'Quadruped opposite arm/leg for multi-planar core control.',
     'scale', '{"min":0,"max":3,"labels":["Pain / unable","Major compensation","Minor compensation","Perfect"]}', 80),
    ('thomas-test', 'Thomas test', 'mobility',
     'Screen for hip flexor tightness.',
     'pass_fail', '{"passLabel":"Clear","failLabel":"Tight"}', 90),
    ('ankle-dorsiflexion', 'Ankle dorsiflexion (knee-to-wall)', 'mobility',
     'Knee-to-wall distance predicting squat quality.',
     'measurement', '{"unit":"cm","higherIsBetter":true}', 100),
    -- Posture
    ('posture-anterior', 'Static posture — anterior', 'posture',
     'Observe alignment from the front. Note knee valgus, shoulder height, etc.',
     'notes', '{}', 110),
    ('posture-lateral', 'Static posture — lateral', 'posture',
     'Observe side view. Common flags: forward head, rounded shoulders, anterior pelvic tilt.',
     'notes', '{}', 120),
    ('posture-posterior', 'Static posture — posterior', 'posture',
     'Observe from the back for scapular winging, spinal curves, and asymmetry.',
     'notes', '{}', 130),
    -- Strength
    ('estimated-1rm-squat', 'Estimated 1RM — squat', 'strength',
     'Use a rep-max test rather than a true 1RM for new clients.',
     'measurement', '{"unit":"lbs","higherIsBetter":true}', 140),
    ('estimated-1rm-bench', 'Estimated 1RM — bench', 'strength',
     'Use a rep-max test rather than a true 1RM for new clients.',
     'measurement', '{"unit":"lbs","higherIsBetter":true}', 150),
    ('estimated-1rm-deadlift', 'Estimated 1RM — deadlift', 'strength',
     'Use a rep-max test rather than a true 1RM for new clients.',
     'measurement', '{"unit":"lbs","higherIsBetter":true}', 160),
    ('estimated-1rm-ohp', 'Estimated 1RM — overhead press', 'strength',
     'Use a rep-max test rather than a true 1RM for new clients.',
     'measurement', '{"unit":"lbs","higherIsBetter":true}', 170),
    ('grip-strength', 'Grip strength', 'strength',
     'Measured via dynamometer.',
     'measurement', '{"unit":"kg","higherIsBetter":true}', 180),
    ('push-up-max', 'Push-up max reps', 'strength',
     'Total unbroken push-up repetitions.',
     'measurement', '{"unit":"reps","higherIsBetter":true}', 190),
    ('pull-up-max', 'Pull-up / inverted row max reps', 'strength',
     'Total unbroken pull-up or inverted row repetitions.',
     'measurement', '{"unit":"reps","higherIsBetter":true}', 200),
    ('plank-hold', 'Plank hold', 'strength',
     'Isometric front plank duration.',
     'measurement', '{"unit":"sec","higherIsBetter":true}', 210),
    ('side-plank-hold', 'Side plank hold', 'strength',
     'Isometric side plank duration (note left/right in notes).',
     'measurement', '{"unit":"sec","higherIsBetter":true}', 220),
    ('wall-sit-hold', 'Wall sit hold', 'strength',
     'Isometric wall sit duration.',
     'measurement', '{"unit":"sec","higherIsBetter":true}', 230),
    -- Cardiovascular
    ('resting-heart-rate', 'Resting heart rate', 'cardiovascular',
     'Resting heart rate in beats per minute.',
     'measurement', '{"unit":"bpm","higherIsBetter":false}', 240),
    ('blood-pressure', 'Blood pressure', 'cardiovascular',
     'Record systolic/diastolic in notes (e.g. 120/80). Optionally enter systolic as the measurement.',
     'measurement', '{"unit":"mmHg","higherIsBetter":false}', 250),
    ('step-test-3min', '3-minute step test', 'cardiovascular',
     'Recovery heart rate after a 3-minute step test.',
     'measurement', '{"unit":"bpm","higherIsBetter":false}', 260),
    ('cooper-run-12min', '12-minute Cooper run', 'cardiovascular',
     'Distance covered in 12 minutes.',
     'measurement', '{"unit":"m","higherIsBetter":true}', 270),
    ('one-mile-walk', '1-mile walk test', 'cardiovascular',
     'Time to complete 1 mile for deconditioned clients.',
     'measurement', '{"unit":"min","higherIsBetter":false}', 280),
    ('vo2max-estimate', 'VO2max estimate', 'cardiovascular',
     'Estimated VO2max from a submaximal protocol.',
     'measurement', '{"unit":"ml/kg/min","higherIsBetter":true}', 290),
    ('heart-rate-recovery', 'Heart rate recovery', 'cardiovascular',
     'HR drop at 1 and/or 2 minutes post-effort. Record details in notes.',
     'measurement', '{"unit":"bpm","higherIsBetter":true}', 300),
    -- Power / athletic
    ('vertical-jump', 'Vertical jump', 'power',
     'Standing vertical jump height.',
     'measurement', '{"unit":"in","higherIsBetter":true}', 310),
    ('broad-jump', 'Broad jump', 'power',
     'Standing long jump distance.',
     'measurement', '{"unit":"in","higherIsBetter":true}', 320),
    ('medicine-ball-throw', 'Medicine ball throw', 'power',
     'Seated chest pass or rotational throw distance.',
     'measurement', '{"unit":"ft","higherIsBetter":true}', 330),
    ('sprint-10m', '10 m sprint', 'power',
     'Sprint time over 10 meters.',
     'measurement', '{"unit":"sec","higherIsBetter":false}', 340),
    ('sprint-20m', '20 m sprint', 'power',
     'Sprint time over 20 meters.',
     'measurement', '{"unit":"sec","higherIsBetter":false}', 350),
    ('pro-agility-5-10-5', '5-10-5 pro agility', 'power',
     'Pro agility shuttle time.',
     'measurement', '{"unit":"sec","higherIsBetter":false}', 360),
    -- Body composition
    ('height', 'Height', 'body_composition',
     'Standing height.',
     'measurement', '{"unit":"cm","higherIsBetter":null}', 370),
    ('body-weight', 'Body weight', 'body_composition',
     'Body weight.',
     'measurement', '{"unit":"lbs","higherIsBetter":null}', 380),
    ('bmi', 'BMI', 'body_composition',
     'Body mass index.',
     'measurement', '{"unit":"kg/m²","higherIsBetter":null}', 390),
    ('waist-circumference', 'Waist circumference', 'body_composition',
     'Waist circumference at the narrowest point or umbilicus.',
     'measurement', '{"unit":"cm","higherIsBetter":false}', 400),
    ('hip-circumference', 'Hip circumference', 'body_composition',
     'Hip circumference at the widest point.',
     'measurement', '{"unit":"cm","higherIsBetter":null}', 410),
    ('chest-circumference', 'Chest circumference', 'body_composition',
     'Chest circumference.',
     'measurement', '{"unit":"cm","higherIsBetter":null}', 420),
    ('arm-circumference', 'Arm circumference', 'body_composition',
     'Upper arm circumference (note left/right in notes).',
     'measurement', '{"unit":"cm","higherIsBetter":null}', 430),
    ('thigh-circumference', 'Thigh circumference', 'body_composition',
     'Thigh circumference (note left/right in notes).',
     'measurement', '{"unit":"cm","higherIsBetter":null}', 440),
    ('waist-to-hip-ratio', 'Waist-to-hip ratio', 'body_composition',
     'Waist circumference divided by hip circumference.',
     'measurement', '{"unit":"ratio","higherIsBetter":false}', 450),
    -- Health / intake
    ('par-q-plus', 'PAR-Q+', 'health_intake',
     'Pre-exercise readiness questionnaire clearance.',
     'pass_fail', '{"passLabel":"Cleared","failLabel":"Referral needed"}', 460),
    ('injury-history', 'Injury history & current pain', 'health_intake',
     'Document prior injuries and current pain locations/severity.',
     'notes', '{}', 470),
    ('medications-conditions', 'Medications & medical conditions', 'health_intake',
     'Relevant medications and medical conditions.',
     'notes', '{}', 480),
    ('sleep-stress-nutrition-baseline', 'Sleep, stress & nutrition baseline', 'health_intake',
     'Baseline lifestyle factors relevant to coaching.',
     'notes', '{}', 490)
) as v(slug, name, category, instructions, rubric_type, rubric_config, sort_order)
where not exists (
  select 1
  from public.assessment_items ai
  where ai.coach_id is null
    and ai.slug = v.slug
);

-- ---------------------------------------------------------------------------
-- Backfill legacy onboarding assessment notes into structured sessions
-- ---------------------------------------------------------------------------

insert into public.client_assessments (
  client_id,
  coach_id,
  title,
  assessed_at,
  overall_notes,
  source,
  created_at,
  updated_at
)
select
  c.id,
  c.coach_id,
  'Imported assessment notes',
  coalesce(c.updated_at, c.created_at, timezone('utc', now())),
  trim(c.onboarding_assessment_notes),
  'legacy_import',
  timezone('utc', now()),
  timezone('utc', now())
from public.clients c
where c.onboarding_assessment_notes is not null
  and trim(c.onboarding_assessment_notes) <> ''
  and not exists (
    select 1
    from public.client_assessments a
    where a.client_id = c.id
      and a.source = 'legacy_import'
  );
