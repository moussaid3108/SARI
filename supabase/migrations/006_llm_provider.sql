alter table public.bots
  add column if not exists llm_provider text not null default 'deepseek'
    check (llm_provider in ('deepseek', 'groq', 'openai'));
