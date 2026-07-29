-- Account invites stay valid until accepted/revoked (null expiry = never expires).
-- Temporarily disable the share guard so a service-role/migration update of
-- invite_expires_at is not blocked when auth.uid() is null.

alter table public.clients disable trigger clients_gym_share_guard;

update public.clients
set invite_expires_at = null
where invite_status = 'pending'
  and invite_token is not null
  and invite_expires_at is not null;

alter table public.clients enable trigger clients_gym_share_guard;

update public.gym_invites
set expires_at = null
where status = 'pending'
  and expires_at is not null;
