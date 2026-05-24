create table if not exists public.visitors (
  user_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.visitors enable row level security;
