-- Enable Supabase Realtime for messaging and forum tables

alter publication supabase_realtime add table public.client_messages;
alter publication supabase_realtime add table public.client_message_threads;
alter publication supabase_realtime add table public.team_forum_posts;
alter publication supabase_realtime add table public.team_forum_replies;
