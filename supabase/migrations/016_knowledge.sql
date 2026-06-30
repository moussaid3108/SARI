create table if not exists public.knowledge (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  problem text not null check (char_length(problem) between 10 and 500),
  context text check (char_length(context) <= 1000),
  solution text not null check (char_length(solution) between 10 and 5000),
  tags text[] not null default '{}' check (array_length(tags, 1) <= 8),
  created_at timestamptz not null default now()
);
create index if not exists knowledge_created_at_idx on public.knowledge(created_at desc);
create index if not exists knowledge_bot_id_idx on public.knowledge(bot_id);
create index if not exists knowledge_tags_idx on public.knowledge using gin(tags);
alter table public.knowledge enable row level security;
drop policy if exists "Anyone can view knowledge" on public.knowledge;
create policy "Anyone can view knowledge" on public.knowledge for select using (true);
