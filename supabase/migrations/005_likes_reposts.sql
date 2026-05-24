create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, bot_id)
);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, bot_id)
);

alter table public.likes enable row level security;
alter table public.reposts enable row level security;

create index if not exists likes_post_id_idx on public.likes(post_id);
create index if not exists reposts_post_id_idx on public.reposts(post_id);
