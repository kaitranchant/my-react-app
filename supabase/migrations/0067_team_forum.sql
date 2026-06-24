-- Team community forum: threaded discussion for team members

-- ---------------------------------------------------------------------------
-- team_forum_posts
-- ---------------------------------------------------------------------------

create table if not exists public.team_forum_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role public.message_sender_role not null,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 4000
  ),
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_forum_posts_team_id_idx
  on public.team_forum_posts (team_id);
create index if not exists team_forum_posts_created_at_idx
  on public.team_forum_posts (team_id, created_at desc);

drop trigger if exists team_forum_posts_set_updated_at on public.team_forum_posts;
create trigger team_forum_posts_set_updated_at
  before update on public.team_forum_posts
  for each row execute function public.set_updated_at();

alter table public.team_forum_posts enable row level security;

drop policy if exists "Coaches can view their team forum posts" on public.team_forum_posts;
create policy "Coaches can view their team forum posts"
  on public.team_forum_posts for select
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can view their team forum posts" on public.team_forum_posts;
create policy "Clients can view their team forum posts"
  on public.team_forum_posts for select
  using (public.is_team_member(team_id));

drop policy if exists "Coaches can insert team forum posts" on public.team_forum_posts;
create policy "Coaches can insert team forum posts"
  on public.team_forum_posts for insert
  with check (
    author_id = auth.uid()
    and author_role = 'coach'
    and exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert team forum posts" on public.team_forum_posts;
create policy "Clients can insert team forum posts"
  on public.team_forum_posts for insert
  with check (
    author_id = auth.uid()
    and author_role = 'client'
    and public.is_team_member(team_id)
  );

drop policy if exists "Coaches can update their team forum posts" on public.team_forum_posts;
create policy "Coaches can update their team forum posts"
  on public.team_forum_posts for update
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their forum posts" on public.team_forum_posts;
create policy "Clients can update their forum posts"
  on public.team_forum_posts for update
  using (author_id = auth.uid() and author_role = 'client')
  with check (author_id = auth.uid() and author_role = 'client');

drop policy if exists "Coaches can delete their team forum posts" on public.team_forum_posts;
create policy "Coaches can delete their team forum posts"
  on public.team_forum_posts for delete
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their forum posts" on public.team_forum_posts;
create policy "Clients can delete their forum posts"
  on public.team_forum_posts for delete
  using (author_id = auth.uid() and author_role = 'client');

-- ---------------------------------------------------------------------------
-- team_forum_replies
-- ---------------------------------------------------------------------------

create table if not exists public.team_forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.team_forum_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_role public.message_sender_role not null,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 2000
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_forum_replies_post_id_idx
  on public.team_forum_replies (post_id);
create index if not exists team_forum_replies_created_at_idx
  on public.team_forum_replies (post_id, created_at asc);

alter table public.team_forum_replies enable row level security;

drop policy if exists "Coaches can view their team forum replies" on public.team_forum_replies;
create policy "Coaches can view their team forum replies"
  on public.team_forum_replies for select
  using (
    exists (
      select 1
      from public.team_forum_posts p
      join public.teams t on t.id = p.team_id
      where p.id = post_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can view their team forum replies" on public.team_forum_replies;
create policy "Clients can view their team forum replies"
  on public.team_forum_replies for select
  using (
    exists (
      select 1
      from public.team_forum_posts p
      where p.id = post_id
        and public.is_team_member(p.team_id)
    )
  );

drop policy if exists "Coaches can insert team forum replies" on public.team_forum_replies;
create policy "Coaches can insert team forum replies"
  on public.team_forum_replies for insert
  with check (
    author_id = auth.uid()
    and author_role = 'coach'
    and exists (
      select 1
      from public.team_forum_posts p
      join public.teams t on t.id = p.team_id
      where p.id = post_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert team forum replies" on public.team_forum_replies;
create policy "Clients can insert team forum replies"
  on public.team_forum_replies for insert
  with check (
    author_id = auth.uid()
    and author_role = 'client'
    and exists (
      select 1
      from public.team_forum_posts p
      where p.id = post_id
        and public.is_team_member(p.team_id)
    )
  );

drop policy if exists "Coaches can delete their team forum replies" on public.team_forum_replies;
create policy "Coaches can delete their team forum replies"
  on public.team_forum_replies for delete
  using (
    exists (
      select 1
      from public.team_forum_posts p
      join public.teams t on t.id = p.team_id
      where p.id = post_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their forum replies" on public.team_forum_replies;
create policy "Clients can delete their forum replies"
  on public.team_forum_replies for delete
  using (author_id = auth.uid() and author_role = 'client');

comment on table public.team_forum_posts is
  'Community forum posts for team peer discussion.';
comment on table public.team_forum_replies is
  'Replies to team forum posts.';
