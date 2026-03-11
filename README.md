# Photobooth

School festival photobooth — take 4 photos, get a framed photo strip with a QR code to download.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Storage** → Create a new bucket named `photobooth`
3. Set the bucket to **Public** (so QR code links work without auth)
4. Copy your **Project URL** and **anon key** from Settings → API
5. Paste them into `index.html`:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Storage Policy

Add an INSERT policy to allow anonymous uploads:

- **Policy name:** `Allow public uploads`
- **Target roles:** `anon`
- **Operation:** `INSERT`
- **WITH CHECK:** `true`

Add a SELECT policy for public reads:

- **Policy name:** `Allow public reads`
- **Target roles:** `anon`
- **Operation:** `SELECT`
- **USING:** `true`

### Auto-Delete After 24 Hours

The app runs client-side cleanup on load. For reliable server-side cleanup, add a **pg_cron** job in the Supabase SQL Editor:

```sql
-- Enable pg_cron (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-photobooth-storage',
  '0 * * * *',
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'photobooth'
      AND created_at < NOW() - INTERVAL '24 hours';
  $$
);
```

This automatically deletes photos older than 24 hours every hour.