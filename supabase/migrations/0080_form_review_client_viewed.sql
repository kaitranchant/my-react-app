-- Track when a client has viewed coach form review feedback (for nav badges).
alter table public.client_form_reviews
  add column if not exists client_viewed_at timestamptz;

create index if not exists client_form_reviews_client_unviewed_idx
  on public.client_form_reviews (client_id)
  where reviewed_at is not null and client_viewed_at is null;
