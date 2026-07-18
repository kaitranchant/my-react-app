-- Seed questionnaire assessment items (uses enum value added in 0134)

insert into public.assessment_items (
  slug, name, category, instructions, rubric_type, rubric_config, sort_order, is_active
)
select
  v.slug,
  v.name,
  v.category::public.assessment_item_category,
  v.instructions,
  'questionnaire'::public.assessment_rubric_type,
  v.rubric_config::jsonb,
  v.sort_order,
  true
from (
  values
    ('par-q-plus-v2', 'PAR-Q+', 'health_intake',
     'Pre-exercise readiness questionnaire (7 yes/no items). Any yes may require clearance.',
     '{"mode":"multi_yes_no","escalateOnYes":true,"questions":[{"id":"q1","text":"Has a doctor ever said you have a heart condition?"},{"id":"q2","text":"Do you feel pain in your chest when you do physical activity?"},{"id":"q3","text":"In the past month, have you had chest pain when not doing physical activity?"},{"id":"q4","text":"Do you lose balance because of dizziness or ever lose consciousness?"},{"id":"q5","text":"Do you have a bone or joint problem that could be made worse by activity?"},{"id":"q6","text":"Is your doctor currently prescribing drugs for blood pressure or a heart condition?"},{"id":"q7","text":"Do you know of any other reason why you should not do physical activity?"}]}',
     460),
    ('injury-history-v2', 'Injury history', 'health_intake',
     'Current or prior injuries and pain.',
     '{"mode":"yes_no_text","yesLabel":"Yes","noLabel":"No","prompt":"Any current or prior injuries / pain?"}',
     470),
    ('medications-conditions-v2', 'Medications & conditions', 'health_intake',
     'Relevant medications and medical conditions.',
     '{"mode":"yes_no_text","yesLabel":"Yes","noLabel":"No","prompt":"Any medications or medical conditions to note?"}',
     480),
    ('sleep-stress-nutrition-v2', 'Sleep / stress / nutrition baseline', 'health_intake',
     'Baseline lifestyle ratings with optional notes.',
     '{"mode":"scale_text","min":1,"max":5,"prompt":"Rate sleep, stress, and nutrition overall (1–5)","labels":["Poor","Fair","OK","Good","Excellent"]}',
     490)
) as v(slug, name, category, instructions, rubric_config, sort_order)
where not exists (
  select 1
  from public.assessment_items ai
  where ai.coach_id is null
    and ai.slug = v.slug
);

update public.assessment_items ai
set
  name = v.name,
  category = v.category::public.assessment_item_category,
  instructions = v.instructions,
  rubric_type = 'questionnaire'::public.assessment_rubric_type,
  rubric_config = v.rubric_config::jsonb,
  sort_order = v.sort_order,
  is_active = true,
  updated_at = timezone('utc', now())
from (
  values
    ('par-q-plus-v2', 'PAR-Q+', 'health_intake',
     'Pre-exercise readiness questionnaire (7 yes/no items). Any yes may require clearance.',
     '{"mode":"multi_yes_no","escalateOnYes":true,"questions":[{"id":"q1","text":"Has a doctor ever said you have a heart condition?"},{"id":"q2","text":"Do you feel pain in your chest when you do physical activity?"},{"id":"q3","text":"In the past month, have you had chest pain when not doing physical activity?"},{"id":"q4","text":"Do you lose balance because of dizziness or ever lose consciousness?"},{"id":"q5","text":"Do you have a bone or joint problem that could be made worse by activity?"},{"id":"q6","text":"Is your doctor currently prescribing drugs for blood pressure or a heart condition?"},{"id":"q7","text":"Do you know of any other reason why you should not do physical activity?"}]}',
     460),
    ('injury-history-v2', 'Injury history', 'health_intake',
     'Current or prior injuries and pain.',
     '{"mode":"yes_no_text","yesLabel":"Yes","noLabel":"No","prompt":"Any current or prior injuries / pain?"}',
     470),
    ('medications-conditions-v2', 'Medications & conditions', 'health_intake',
     'Relevant medications and medical conditions.',
     '{"mode":"yes_no_text","yesLabel":"Yes","noLabel":"No","prompt":"Any medications or medical conditions to note?"}',
     480),
    ('sleep-stress-nutrition-v2', 'Sleep / stress / nutrition baseline', 'health_intake',
     'Baseline lifestyle ratings with optional notes.',
     '{"mode":"scale_text","min":1,"max":5,"prompt":"Rate sleep, stress, and nutrition overall (1–5)","labels":["Poor","Fair","OK","Good","Excellent"]}',
     490)
) as v(slug, name, category, instructions, rubric_config, sort_order)
where ai.coach_id is null
  and ai.slug = v.slug;
