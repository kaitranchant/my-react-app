-- Query performance: composite indexes and inbox helper functions

-- Inbox ordering and unread counts by coach
create index if not exists client_messages_coach_id_created_at_idx
  on public.client_messages (coach_id, created_at desc);

-- Load, compliance, portal heatmaps
create index if not exists client_scheduled_workouts_client_date_status_idx
  on public.client_scheduled_workouts (client_id, scheduled_date, status);

-- Nav badge counts for pending form reviews
create index if not exists client_form_reviews_coach_pending_idx
  on public.client_form_reviews (coach_id)
  where reviewed_at is null;

-- Total unread messages for a coach inbox badge
create or replace function public.count_coach_unread_messages(p_coach_id uuid)
returns bigint
language sql
stable
as $$
  select count(*)::bigint
  from public.client_messages m
  inner join public.client_message_threads t on t.client_id = m.client_id
  where m.coach_id = p_coach_id
    and m.sender_role = 'client'
    and m.created_at > coalesce(t.coach_last_read_at, '-infinity'::timestamptz);
$$;

-- Unread message counts grouped by client (compliance, inbox)
create or replace function public.get_coach_unread_by_client(p_coach_id uuid)
returns table (client_id uuid, unread_count bigint)
language sql
stable
as $$
  select m.client_id, count(*)::bigint
  from public.client_messages m
  inner join public.client_message_threads t on t.client_id = m.client_id
  where m.coach_id = p_coach_id
    and m.sender_role = 'client'
    and m.created_at > coalesce(t.coach_last_read_at, '-infinity'::timestamptz)
  group by m.client_id;
$$;

-- Latest message per client for inbox previews
create or replace function public.get_coach_latest_messages(p_coach_id uuid)
returns table (
  client_id uuid,
  body text,
  sender_role public.message_sender_role,
  created_at timestamptz,
  message_type public.client_message_type
)
language sql
stable
as $$
  select distinct on (m.client_id)
    m.client_id,
    m.body,
    m.sender_role,
    m.created_at,
    m.message_type
  from public.client_messages m
  where m.coach_id = p_coach_id
  order by m.client_id, m.created_at desc;
$$;

grant execute on function public.count_coach_unread_messages(uuid) to authenticated;
grant execute on function public.get_coach_unread_by_client(uuid) to authenticated;
grant execute on function public.get_coach_latest_messages(uuid) to authenticated;

-- Client portal unread digest batching (cron)
create or replace function public.get_client_unread_from_coach(p_client_ids uuid[])
returns table (client_id uuid, unread_count bigint)
language sql
stable
as $$
  select m.client_id, count(*)::bigint
  from public.client_messages m
  inner join public.client_message_threads t on t.client_id = m.client_id
  where m.client_id = any(p_client_ids)
    and m.sender_role = 'coach'
    and m.created_at > coalesce(t.client_last_read_at, '-infinity'::timestamptz)
  group by m.client_id;
$$;

create or replace function public.get_client_latest_coach_messages(p_client_ids uuid[])
returns table (
  client_id uuid,
  body text,
  created_at timestamptz,
  message_type public.client_message_type
)
language sql
stable
as $$
  select distinct on (m.client_id)
    m.client_id,
    m.body,
    m.created_at,
    m.message_type
  from public.client_messages m
  where m.client_id = any(p_client_ids)
    and m.sender_role = 'coach'
  order by m.client_id, m.created_at desc;
$$;

grant execute on function public.get_client_unread_from_coach(uuid[]) to authenticated;
grant execute on function public.get_client_latest_coach_messages(uuid[]) to authenticated;
