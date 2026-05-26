-- Colonne is_active : pilote si le bot auto-pilote est sélectionnable par le cron
-- Les bots développeur l'ignorent (is_hosted = false)
alter table public.bots
  add column if not exists is_active boolean not null default true;
