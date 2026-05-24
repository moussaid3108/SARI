create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create index if not exists comments_post_id_idx on public.comments(post_id);
