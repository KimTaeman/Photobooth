-- Enable Database Webhooks support and schedule the 24-hour Cloudinary cleanup.
-- Replace both placeholders before running once in the Supabase SQL editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

select vault.create_secret(
  'https://yzeorfygmubgyukeypsx.supabase.co/functions/v1/cloudinary-retention',
  'cloudinary_retention_url'
);

select vault.create_secret(
  'SAME_LONG_RANDOM_VALUE_AS_RETENTION_CRON_SECRET',
  'cloudinary_retention_secret'
);

select cron.schedule(
  'tatt-n-snap-media-retention',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'cloudinary_retention_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cloudinary_retention_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
