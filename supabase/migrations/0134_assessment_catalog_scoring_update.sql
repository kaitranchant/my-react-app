-- Align assessment catalog scoring with ordinal / binary+checklist / continuous chart
-- Questionnaire items are seeded in 0135 (enum value cannot be used until this txn commits)

-- ---------------------------------------------------------------------------
-- Enum: questionnaire
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'assessment_rubric_type'
      and e.enumlabel = 'questionnaire'
  ) then
    alter type public.assessment_rubric_type add value 'questionnaire';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Flexible score payload for bilateral, checklists, multi-metric
-- ---------------------------------------------------------------------------

alter table public.client_assessment_results
  add column if not exists score_data jsonb not null default '{}'::jsonb;

alter table public.client_assessment_results
  drop constraint if exists client_assessment_results_score_shape;

alter table public.client_assessment_results
  add constraint client_assessment_results_score_shape check (
    (
      rubric_type = 'scale'
      and pass_fail is null
      and measurement_value is null
      and (
        scale_score is not null
        or (
          score_data ? 'left'
          and score_data ? 'right'
        )
      )
    )
    or (
      rubric_type = 'pass_fail'
      and scale_score is null
      and measurement_value is null
      and (
        pass_fail is not null
        or (
          score_data ? 'left'
          and score_data ? 'right'
        )
        or jsonb_typeof(score_data -> 'observations') = 'object'
      )
    )
    or (
      rubric_type = 'measurement'
      and scale_score is null
      and pass_fail is null
      and (
        measurement_value is not null
        or (
          score_data ? 'left'
          and score_data ? 'right'
        )
        or jsonb_typeof(score_data -> 'fields') = 'object'
      )
    )
    or (
      rubric_type = 'notes'
      and scale_score is null
      and pass_fail is null
      and measurement_value is null
    )
    or (
      rubric_type::text = 'questionnaire'
      and scale_score is null
      and pass_fail is null
      and measurement_value is null
      and score_data is not null
      and score_data <> '{}'::jsonb
    )
  );

comment on column public.client_assessment_results.score_data is
  'Extended scoring payload: bilateral sides, observation checklists, multi-metric fields, questionnaire answers.';

-- ---------------------------------------------------------------------------
-- Deactivate items replaced / renamed by the chart
-- ---------------------------------------------------------------------------

update public.assessment_items
set is_active = false, updated_at = timezone('utc', now())
where coach_id is null
  and slug in (
    'shoulder-mobility',
    'posture-anterior',
    'posture-lateral',
    'posture-posterior',
    'estimated-1rm-squat',
    'estimated-1rm-bench',
    'estimated-1rm-deadlift',
    'estimated-1rm-ohp',
    'wall-sit-hold',
    'cooper-run-12min',
    'one-mile-walk',
    'par-q-plus',
    'injury-history',
    'medications-conditions',
    'sleep-stress-nutrition-baseline'
  );

-- ---------------------------------------------------------------------------
-- Catalog upsert via temp table (no questionnaire rows here)
-- ---------------------------------------------------------------------------

create temporary table assessment_catalog_seed (
  slug text primary key,
  name text not null,
  category text not null,
  instructions text,
  rubric_type text not null,
  rubric_config jsonb not null,
  sort_order integer not null
) on commit drop;

insert into assessment_catalog_seed (
  slug, name, category, instructions, rubric_type, rubric_config, sort_order
) values
  ('overhead-squat', 'Overhead squat', 'mobility',
   'FMS-style quality screen. 0 = pain, 1 = cannot complete, 2 = completes with compensation, 3 = correct pattern.',
   'scale',
   '{"min":0,"max":3,"bilateral":false,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   10),
  ('single-leg-squat-step-down', 'Single-leg squat / step-down', 'mobility',
   'Score each side 0–3 for hip/knee control and asymmetry.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   20),
  ('hurdle-step', 'Hurdle step', 'mobility',
   'Score each side 0–3 for hip flexion and stride stability.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   30),
  ('in-line-lunge', 'In-line lunge', 'mobility',
   'Score each side 0–3 for trunk stability and split-stance mobility.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   40),
  ('shoulder-mobility-ordinal', 'Shoulder mobility', 'mobility',
   'Score each side 0–3 for shoulder mobility quality.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   50),
  ('active-straight-leg-raise', 'Active straight-leg raise', 'mobility',
   'Score each side 0–3 for hamstring length and core control.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   60),
  ('trunk-stability-push-up', 'Trunk stability push-up', 'mobility',
   'Score 0–3 for core stability during pressing.',
   'scale',
   '{"min":0,"max":3,"bilateral":false,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   70),
  ('rotary-stability', 'Rotary stability', 'mobility',
   'Score each side 0–3 for multi-planar core control.',
   'scale',
   '{"min":0,"max":3,"bilateral":true,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   80),
  ('push-pull-assessment', 'Push/pull assessment', 'mobility',
   'Score 0–3 for pressing and pulling movement quality.',
   'scale',
   '{"min":0,"max":3,"bilateral":false,"labels":["Pain","Cannot complete","Compensation","Perfect"],"painFlag":true}'::jsonb,
   85),
  ('shoulder-impingement-clearing', 'Shoulder impingement clearing', 'mobility',
   'Pass/fail clearing test per side. Note pain or positive signs.',
   'pass_fail',
   '{"bilateral":true,"passLabel":"Pass","failLabel":"Fail","observations":["pain","impingement_sign","limited_rom"]}'::jsonb,
   86),
  ('spinal-extension-clearing', 'Spinal extension clearing', 'mobility',
   'Pass/fail spinal extension clearing test.',
   'pass_fail',
   '{"bilateral":false,"passLabel":"Pass","failLabel":"Fail","observations":["pain","limited_rom","compensation"]}'::jsonb,
   87),
  ('spinal-flexion-clearing', 'Spinal flexion clearing', 'mobility',
   'Pass/fail spinal flexion clearing test.',
   'pass_fail',
   '{"bilateral":false,"passLabel":"Pass","failLabel":"Fail","observations":["pain","limited_rom","compensation"]}'::jsonb,
   88),
  ('thomas-test', 'Thomas test', 'mobility',
   'Pass/fail hip flexor tightness screen per side.',
   'pass_fail',
   '{"bilateral":true,"passLabel":"Pass","failLabel":"Fail","observations":["hip_flexor_tight","knee_extension_limited"]}'::jsonb,
   90),
  ('ankle-dorsiflexion', 'Ankle dorsiflexion (knee-to-wall)', 'mobility',
   'Knee-to-wall distance in cm for each side.',
   'measurement',
   '{"unit":"cm","higherIsBetter":true,"bilateral":true}'::jsonb,
   100),
  ('posture-anterior-v2', 'Anterior view', 'posture',
   'Mark deviations present or absent from the front view.',
   'pass_fail',
   '{"passLabel":"Clear","failLabel":"Deviations","observations":["head_tilt","shoulder_height","knee_valgus","foot_pronation","asymmetry"]}'::jsonb,
   110),
  ('posture-lateral-v2', 'Lateral view', 'posture',
   'Mark deviations present or absent from the side view.',
   'pass_fail',
   '{"passLabel":"Clear","failLabel":"Deviations","observations":["forward_head","rounded_shoulders","anterior_pelvic_tilt","excessive_lordosis","kyphosis"]}'::jsonb,
   120),
  ('posture-posterior-v2', 'Posterior view', 'posture',
   'Mark deviations present or absent from the back view.',
   'pass_fail',
   '{"passLabel":"Clear","failLabel":"Deviations","observations":["scapular_winging","spinal_curve","hip_height","foot_flare","asymmetry"]}'::jsonb,
   130),
  ('squat-1rm', 'Squat 1RM / e1RM', 'strength',
   'Estimated or tested squat one-rep max.',
   'measurement', '{"unit":"lbs","higherIsBetter":true,"alternateUnits":["kg"]}'::jsonb, 140),
  ('bench-1rm', 'Bench 1RM / e1RM', 'strength',
   'Estimated or tested bench press one-rep max.',
   'measurement', '{"unit":"lbs","higherIsBetter":true,"alternateUnits":["kg"]}'::jsonb, 150),
  ('deadlift-1rm', 'Deadlift 1RM / e1RM', 'strength',
   'Estimated or tested deadlift one-rep max.',
   'measurement', '{"unit":"lbs","higherIsBetter":true,"alternateUnits":["kg"]}'::jsonb, 160),
  ('ohp-1rm', 'Overhead press 1RM / e1RM', 'strength',
   'Estimated or tested overhead press one-rep max.',
   'measurement', '{"unit":"lbs","higherIsBetter":true,"alternateUnits":["kg"]}'::jsonb, 170),
  ('grip-strength', 'Grip strength', 'strength',
   'Dynamometer grip strength per hand.',
   'measurement', '{"unit":"kg","higherIsBetter":true,"bilateral":true}'::jsonb, 180),
  ('push-up-max', 'Push-up max reps', 'strength',
   'Total unbroken push-up repetitions.',
   'measurement', '{"unit":"reps","higherIsBetter":true}'::jsonb, 190),
  ('pull-up-max', 'Pull-up / inverted row max reps', 'strength',
   'Total unbroken pull-up or inverted row repetitions.',
   'measurement', '{"unit":"reps","higherIsBetter":true}'::jsonb, 200),
  ('plank-hold', 'Plank hold', 'strength',
   'Front plank hold duration.',
   'measurement', '{"unit":"sec","higherIsBetter":true}'::jsonb, 210),
  ('side-plank-hold', 'Side plank hold', 'strength',
   'Side plank hold duration per side.',
   'measurement', '{"unit":"sec","higherIsBetter":true,"bilateral":true}'::jsonb, 220),
  ('wall-sit', 'Wall sit', 'strength',
   'Wall sit hold duration.',
   'measurement', '{"unit":"sec","higherIsBetter":true}'::jsonb, 230),
  ('resting-heart-rate', 'Resting heart rate', 'cardiovascular',
   'Resting heart rate in beats per minute.',
   'measurement', '{"unit":"bpm","higherIsBetter":false}'::jsonb, 240),
  ('blood-pressure', 'Blood pressure', 'cardiovascular',
   'Systolic and diastolic blood pressure.',
   'measurement',
   '{"unit":"mmHg","higherIsBetter":false,"fields":[{"key":"systolic","label":"Systolic","unit":"mmHg"},{"key":"diastolic","label":"Diastolic","unit":"mmHg"}]}'::jsonb,
   250),
  ('step-test-3min', '3-minute step test', 'cardiovascular',
   'Recovery heart rate after a 3-minute step test.',
   'measurement', '{"unit":"bpm","higherIsBetter":false}'::jsonb, 260),
  ('cooper-12min', 'Cooper 12-minute run', 'cardiovascular',
   'Distance covered in 12 minutes.',
   'measurement', '{"unit":"m","higherIsBetter":true}'::jsonb, 270),
  ('one-mile-walk-v2', '1-mile walk test', 'cardiovascular',
   'Time to complete 1 mile plus finishing heart rate.',
   'measurement',
   '{"unit":"min","higherIsBetter":false,"fields":[{"key":"time_min","label":"Time (min)","unit":"min"},{"key":"time_sec","label":"Time (sec)","unit":"sec"},{"key":"hr_bpm","label":"Heart rate","unit":"bpm"}]}'::jsonb,
   280),
  ('vo2max-estimate', 'VO2max estimate', 'cardiovascular',
   'Estimated VO2max from a submaximal protocol.',
   'measurement', '{"unit":"ml/kg/min","higherIsBetter":true}'::jsonb, 290),
  ('heart-rate-recovery', 'Heart rate recovery', 'cardiovascular',
   'HR drop at 1 minute post-effort.',
   'measurement', '{"unit":"bpm","higherIsBetter":true}'::jsonb, 300),
  ('vertical-jump', 'Vertical jump', 'power',
   'Standing vertical jump height.',
   'measurement', '{"unit":"in","higherIsBetter":true,"alternateUnits":["cm"]}'::jsonb, 310),
  ('broad-jump', 'Broad jump', 'power',
   'Standing long jump distance.',
   'measurement', '{"unit":"in","higherIsBetter":true,"alternateUnits":["cm"]}'::jsonb, 320),
  ('medicine-ball-throw', 'Medicine ball throw', 'power',
   'Chest pass or rotational throw. Use per-side if rotational.',
   'measurement', '{"unit":"m","higherIsBetter":true,"bilateral":true}'::jsonb, 330),
  ('sprint-10m', '10 m sprint', 'power',
   'Sprint time over 10 meters.',
   'measurement', '{"unit":"sec","higherIsBetter":false}'::jsonb, 340),
  ('sprint-20m', '20 m sprint', 'power',
   'Sprint time over 20 meters.',
   'measurement', '{"unit":"sec","higherIsBetter":false}'::jsonb, 350),
  ('pro-agility-5-10-5', '5-10-5 pro agility', 'power',
   'Pro agility shuttle time.',
   'measurement', '{"unit":"sec","higherIsBetter":false}'::jsonb, 360),
  ('inbody-scan', 'InBody scan', 'body_composition',
   'Multi-metric body composition from InBody.',
   'measurement',
   '{"unit":"multi","fields":[{"key":"weight_lbs","label":"Weight","unit":"lbs"},{"key":"body_fat_pct","label":"Body fat %","unit":"%"},{"key":"bmi","label":"BMI","unit":"kg/m²"},{"key":"smm_lbs","label":"Skeletal muscle","unit":"lbs"}]}'::jsonb,
   365),
  ('circumference-measurements', 'Circumference measurements', 'body_composition',
   'Key circumference sites.',
   'measurement',
   '{"unit":"in","alternateUnits":["cm"],"fields":[{"key":"waist","label":"Waist","unit":"in"},{"key":"hips","label":"Hips","unit":"in"},{"key":"chest","label":"Chest","unit":"in"},{"key":"arm","label":"Arm","unit":"in"},{"key":"thigh","label":"Thigh","unit":"in"}]}'::jsonb,
   370),
  ('waist-to-hip-ratio', 'Waist-to-hip ratio', 'body_composition',
   'Waist divided by hip circumference.',
   'measurement', '{"unit":"ratio","higherIsBetter":false}'::jsonb, 380),
  ('height-weight-bmi', 'Height / weight / BMI', 'body_composition',
   'Height, weight, and calculated BMI.',
   'measurement',
   '{"unit":"multi","fields":[{"key":"height_in","label":"Height","unit":"in"},{"key":"weight_lbs","label":"Weight","unit":"lbs"},{"key":"bmi","label":"BMI","unit":"kg/m²"}]}'::jsonb,
   390);

update public.assessment_items ai
set
  name = c.name,
  category = c.category::public.assessment_item_category,
  instructions = c.instructions,
  rubric_type = c.rubric_type::public.assessment_rubric_type,
  rubric_config = c.rubric_config,
  sort_order = c.sort_order,
  is_active = true,
  updated_at = timezone('utc', now())
from assessment_catalog_seed c
where ai.coach_id is null
  and ai.slug = c.slug;

insert into public.assessment_items (
  slug, name, category, instructions, rubric_type, rubric_config, sort_order, is_active
)
select
  c.slug,
  c.name,
  c.category::public.assessment_item_category,
  c.instructions,
  c.rubric_type::public.assessment_rubric_type,
  c.rubric_config,
  c.sort_order,
  true
from assessment_catalog_seed c
where not exists (
  select 1
  from public.assessment_items ai
  where ai.coach_id is null
    and ai.slug = c.slug
);
