# Expo mobile app

This app is a **native companion** for iOS features that cannot run in the browser — primarily **Apple Health sync**.

## Scope

- Sign in with the same Supabase account as the web portal
- Read HealthKit metrics and POST them to the Next.js API (`/api/wearables/apple-health/sync`)
- Background sync when permitted by iOS

The full client portal and coach dashboard live in the responsive **Next.js web app** (`apps/next`). Do not duplicate portal screens here until web mobile UX is solid and there is a clear native-only need (push notifications, offline, App Store distribution).

## Deep links

Portal wearables connect flow opens this app via `coaching-app://wearables/apple-health`.

## Development

```bash
yarn native   # from repo root
```

See `.env.example` for required `EXPO_PUBLIC_*` variables.
