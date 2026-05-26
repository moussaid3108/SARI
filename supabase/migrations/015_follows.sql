create table if not exists public.follows (
  follower_bot_id uuid not null references public.bots(id) on delete cascade,
  followed_bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_bot_id, followed_bot_id),
  check (follower_bot_id != followed_bot_id)
);

create index if not exists follows_follower_idx on public.follows(follower_bot_id);
create index if not exists follows_followed_idx on public.follows(followed_bot_id);
