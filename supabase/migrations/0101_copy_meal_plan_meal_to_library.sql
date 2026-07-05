-- Copy a meal plan meal (and its foods) into the coach meal library in one transaction.

create or replace function public.copy_meal_plan_meal_to_library(
  p_meal_plan_id uuid,
  p_meal_id uuid,
  p_name text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_source public.meal_plan_meals%rowtype;
  v_library_meal_id uuid;
begin
  v_coach_id := auth.uid();
  if v_coach_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Name is required';
  end if;

  select m.*
  into v_source
  from public.meal_plan_meals m
  inner join public.meal_plan_days d on d.id = m.meal_plan_day_id
  inner join public.meal_plans mp on mp.id = d.meal_plan_id
  where m.id = p_meal_id
    and mp.id = p_meal_plan_id
    and mp.coach_id = v_coach_id;

  if not found then
    raise exception 'Meal not found';
  end if;

  insert into public.library_meals (
    coach_id,
    name,
    description,
    meal_type,
    status,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g
  )
  values (
    v_coach_id,
    btrim(p_name),
    v_source.description,
    v_source.meal_type,
    'active',
    v_source.calories_kcal,
    v_source.protein_g,
    v_source.carbs_g,
    v_source.fat_g
  )
  returning id into v_library_meal_id;

  insert into public.library_meal_foods (
    library_meal_id,
    sort_order,
    food_name,
    source,
    external_id,
    quantity_g,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g
  )
  select
    v_library_meal_id,
    f.sort_order,
    f.food_name,
    f.source,
    f.external_id,
    f.quantity_g,
    f.calories_kcal,
    f.protein_g,
    f.carbs_g,
    f.fat_g
  from public.meal_plan_meal_foods f
  where f.meal_plan_meal_id = p_meal_id;

  return v_library_meal_id;
end;
$$;

grant execute on function public.copy_meal_plan_meal_to_library(uuid, uuid, text)
  to authenticated;

comment on function public.copy_meal_plan_meal_to_library(uuid, uuid, text) is
  'Copies an owned meal plan meal and its food rows into library_meals/library_meal_foods.';
