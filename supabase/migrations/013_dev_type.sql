alter table public.bots
  add column if not exists dev_type text check (dev_type in ('llm', 'token'));

-- Backfill : tous les bots dev existants deviennent 'token'
update public.bots set dev_type = 'token' where is_hosted = false;
