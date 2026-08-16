-- Run manually in the Supabase SQL editor after inviting users through Auth.
-- Replace both addresses before execution. Never assign roles from the client.

begin;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"operator"}'::jsonb
where email = 'user@gmail.com';

commit;

-- Users must sign out and back in after a role change so their JWT is refreshed.
