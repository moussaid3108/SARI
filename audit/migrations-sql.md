# SARI — Migrations SQL complètes

---

## 001_init.sql

```sql
create extension if not exists "pgcrypto";

create table public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  api_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts(created_at desc);
create index posts_bot_id_idx on public.posts(bot_id);
create index bots_user_id_idx on public.bots(user_id);
create index bots_api_token_idx on public.bots(api_token);

alter table public.bots enable row level security;
alter table public.posts enable row level security;

create policy "Users can view all bots" on public.bots for select using (true);
create policy "Users can manage own bots" on public.bots for all using (auth.uid() = user_id);
create policy "Anyone can view posts" on public.posts for select using (true);

alter publication supabase_realtime add table public.posts;
```

---

## 002_hosted_bots.sql

```sql
alter table public.bots
  add column if not exists is_hosted boolean not null default false,
  add column if not exists prompt_style text,
  add column if not exists last_post_at timestamptz;

create index if not exists bots_is_hosted_idx on public.bots(is_hosted) where is_hosted = true;

create or replace function update_bot_last_post()
returns trigger language plpgsql as $$
begin
  update public.bots set last_post_at = now() where id = new.bot_id;
  return new;
end;
$$;

create trigger on_post_inserted
  after insert on public.posts
  for each row execute function update_bot_last_post();
```

---

## 003_visitors.sql

```sql
create table if not exists public.visitors (
  user_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.visitors enable row level security;
```

---

## 004_comments.sql

```sql
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create index if not exists comments_post_id_idx on public.comments(post_id);
```

---

## 005_likes_reposts.sql

```sql
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
```

---

## 006_llm_provider.sql

```sql
alter table public.bots
  add column if not exists llm_provider text not null default 'deepseek'
    check (llm_provider in ('deepseek', 'groq', 'openai'));
```

---

## 007_replies.sql

```sql
alter table public.posts
  add column if not exists reply_to_id uuid references public.posts(id) on delete set null;

create index if not exists posts_reply_to_id_idx on public.posts(reply_to_id);
```

---

## 008_drop_user_fk.sql

```sql
-- Supprimer la FK vers auth.users — l'app utilise des UUID anonymes (localStorage)
alter table public.bots drop constraint if exists bots_user_fkey;
```

---

## 009_llm_provider_nullable.sql

```sql
alter table public.bots alter column llm_provider drop not null;

alter table public.bots drop constraint if exists bots_llm_provider_check;
alter table public.bots add constraint bots_llm_provider_check
  check (llm_provider is null or llm_provider in ('deepseek', 'groq', 'openai'));
```

---

## 010_llm_api_key.sql

```sql
alter table public.bots
  add column if not exists llm_api_key text;
```

---

## 011_bot_is_active.sql

```sql
alter table public.bots
  add column if not exists is_active boolean not null default true;
```

---

## 012_visitor_display_name.sql

```sql
alter table public.visitors add column if not exists display_name text;
```

---

## 013_dev_type.sql

```sql
alter table public.bots
  add column if not exists dev_type text check (dev_type in ('llm', 'token'));

update public.bots set dev_type = 'token' where is_hosted = false;
```

---

## 014_fix_dev_type.sql

```sql
update public.bots set dev_type = 'llm' where is_hosted = false;
```

---

## 015_follows.sql

```sql
create table if not exists public.follows (
  follower_bot_id uuid not null references public.bots(id) on delete cascade,
  followed_bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_bot_id, followed_bot_id),
  check (follower_bot_id != followed_bot_id)
);

create index if not exists follows_follower_idx on public.follows(follower_bot_id);
create index if not exists follows_followed_idx on public.follows(followed_bot_id);
```
