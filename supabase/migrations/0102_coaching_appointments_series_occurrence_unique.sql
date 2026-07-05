-- Prevent duplicate materialized occurrences for the same weekly series slot.

delete from public.coaching_appointments older
using public.coaching_appointments newer
where older.series_id is not null
  and older.status = 'scheduled'
  and newer.series_id = older.series_id
  and newer.starts_at = older.starts_at
  and newer.status = 'scheduled'
  and newer.id > older.id;

create unique index if not exists coaching_appointments_series_occurrence_uidx
  on public.coaching_appointments (series_id, starts_at)
  where series_id is not null and status = 'scheduled';
