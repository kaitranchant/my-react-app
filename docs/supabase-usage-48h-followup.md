# Supabase usage monitoring — 48h follow-up

Baseline captured by `yarn check:query-perf` on deploy verification. Use this checklist **24–48 hours after** the query optimization deploy (commit `1070460`, migration `0083`).

## Automated re-check

```bash
yarn check:query-perf
```

This verifies:

- All 5 migration `0083` RPCs respond
- Index-backed query shapes for messages, workouts, form reviews
- Inbox badge parity: `count_coach_unread_messages` = sum of `get_coach_unread_by_client`
- Bulk load query shapes (workouts + check-ins across multiple clients)

Results append to [`supabase-usage-baseline.json`](supabase-usage-baseline.json) with latency comparison vs the previous run.

## Manual dashboard checks

In [Supabase Dashboard](https://supabase.com/dashboard) for your project:

1. **Reports → Database / Query Performance** — top queries by calls and total time should **not** be dominated by:
   - Full `client_messages` scans ordered by `created_at`
   - Per-client loops on `workout_log_sets`, `client_scheduled_workouts`, `client_check_ins`

2. **Database → Advisors** — re-run; note any new slow-query warnings.

3. **Project Settings → Usage** — compare **Database compute**, **Egress**, **Realtime connections**, **Auth requests** to the day before deploy.

4. **Supabase AI Assistant** — ask: *"Which queries consumed the most time in the last 24h?"*

## Success criteria

| Signal | Healthy |
|--------|---------|
| `yarn check:query-perf` | All checks OK |
| Query Performance | `client_messages` not in top 3 by row scans |
| Usage graph | Compute/DB time trending down over 48h |
| Resource warning | Fades or appears less often |
| App | Inbox badge matches `/messages`; load/compliance unchanged |

## If the warning persists

Capture the **top 5 queries** from Query Performance (name, calls, total time, mean time) and investigate:

| Likely driver | Next fix |
|---------------|----------|
| `auth.getUser()` on every request | Middleware session caching |
| `revalidatePath(..., 'layout')` after mutations | Narrow revalidation scope |
| Realtime / egress / storage | Different limit than SQL — check Usage breakdown |
| Large rosters (50+ clients) | Materialized views for ACWR/tonnage |

Do **not** add more indexes or RPCs until Query Performance identifies a specific remaining hotspot.

## Initial baseline snapshot

See `docs/supabase-usage-baseline.json` → `current` for the first captured run (timestamp, RPC latencies, inbox smoke, manual dashboard steps).
