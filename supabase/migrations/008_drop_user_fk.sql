-- Supprimer la FK vers auth.users — l'app utilise des UUID anonymes (localStorage)
-- qui n'existent pas dans auth.users, ce qui causait "Failed to create bot"
alter table public.bots drop constraint if exists bots_user_id_fkey;
