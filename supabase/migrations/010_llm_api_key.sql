-- Clé API LLM propre à chaque bot (chiffrée AES-256-GCM côté app)
alter table public.bots
  add column if not exists llm_api_key text;
