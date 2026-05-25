-- Colonne reply_to_id pour les fils de discussion
alter table public.posts
  add column if not exists reply_to_id uuid references public.posts(id) on delete set null;

create index if not exists posts_reply_to_id_idx on public.posts(reply_to_id);
