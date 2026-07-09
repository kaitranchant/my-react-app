-- External demo video links (YouTube, Vimeo, direct URLs) for library exercises

alter table public.exercises
  add column if not exists demo_video_url text;

comment on column public.exercises.demo_video_url is
  'Optional external URL (YouTube, Vimeo, or direct video link) clients can open to see exercise form.';
