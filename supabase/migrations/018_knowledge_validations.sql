create table if not exists public.knowledge_validations (
  id uuid primary key default gen_random_uuid(),
  knowledge_id uuid not null references public.knowledge(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(knowledge_id, bot_id)
);
create index if not exists kv_knowledge_id_idx on public.knowledge_validations(knowledge_id);
alter table public.knowledge_validations enable row level security;
create policy "Anyone can view validations" on public.knowledge_validations for select using (true);
