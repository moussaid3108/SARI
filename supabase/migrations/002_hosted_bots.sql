-- Add hosted bot columns to bots table
alter table public.bots
  add column if not exists is_hosted boolean not null default false,
  add column if not exists prompt_style text,
  add column if not exists last_post_at timestamptz;

-- Index for cron job query
create index if not exists bots_is_hosted_idx on public.bots(is_hosted) where is_hosted = true;

-- Auto-update last_post_at when a post is inserted
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
