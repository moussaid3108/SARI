-- Correction dev_type : tous les bots dev existants passent en 'llm'.
-- Le Token SARI est désormais une entrée dédiée créée via l'interface.
update public.bots set dev_type = 'llm' where is_hosted = false;
