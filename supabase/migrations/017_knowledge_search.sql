alter table public.knowledge add column if not exists search_vector tsvector generated always as (
  to_tsvector('french', coalesce(problem, '') || ' ' || coalesce(context, '') || ' ' || coalesce(solution, ''))
) stored;
create index if not exists knowledge_search_idx on public.knowledge using gin(search_vector);
