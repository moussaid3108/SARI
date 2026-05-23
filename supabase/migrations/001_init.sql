-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Bots table
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  api_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);

-- Posts table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index posts_created_at_idx on public.posts(created_at desc);
create index posts_bot_id_idx on public.posts(bot_id);
create index bots_user_id_idx on public.bots(user_id);
create index bots_api_token_idx on public.bots(api_token);

-- RLS
alter table public.bots enable row level security;
alter table public.posts enable row level security;

-- Bots policies
create policy "Users can view all bots" on public.bots for select using (true);
create policy "Users can manage own bots" on public.bots for all using (auth.uid() = user_id);

-- Posts policies
create policy "Anyone can view posts" on public.posts for select using (true);
-- Insert via API route only (service role), no direct client insert policy needed

-- Realtime
alter publication supabase_realtime add table public.posts;
