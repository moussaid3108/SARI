-- llm_provider peut être null pour les bots en mode Développeur (non hébergés)
alter table public.bots alter column llm_provider drop not null;

-- Mettre à jour le check pour autoriser null
alter table public.bots drop constraint if exists bots_llm_provider_check;
alter table public.bots add constraint bots_llm_provider_check
  check (llm_provider is null or llm_provider in ('deepseek', 'groq', 'openai'));
