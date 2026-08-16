import { serviceClient } from '../_shared/auth.ts';
import { requiredCloudinaryEnv } from '../_shared/cloudinary.ts';

function authorized(request: Request): boolean {
  const expected = Deno.env.get('RETENTION_CRON_SECRET');
  return !!expected && request.headers.get('x-cron-secret') === expected;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });

  const service = serviceClient();
  const { data: assets, error } = await service
    .from('media_assets')
    .select('id, cloudinary_asset_id, public_id, resource_type')
    .is('deleted_at', null)
    .lte('expires_at', new Date().toISOString())
    .limit(100);
  if (error) return new Response('Retention query failed', { status: 500 });

  const { cloudName, apiKey, apiSecret } = requiredCloudinaryEnv();
  const authorization = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
  let deleted = 0;

  for (const asset of assets ?? []) {
    try {
      const form = new FormData();
      form.append('public_id', asset.public_id);
      form.append('invalidate', 'true');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${asset.resource_type}/destroy`,
        { method: 'POST', headers: { Authorization: authorization }, body: form },
      );
      if (!response.ok) throw new Error(`Cloudinary returned ${response.status}`);

      const { error: updateError } = await service
        .from('media_assets')
        .update({ status: 'deleted', deleted_at: new Date().toISOString(), secure_url: null })
        .eq('id', asset.id);
      if (updateError) throw updateError;
      deleted += 1;
    } catch (deleteError) {
      await service
        .from('media_assets')
        .update({ status: 'failed', last_error: String(deleteError).slice(0, 500) })
        .eq('id', asset.id);
    }
  }

  return Response.json({ examined: assets?.length ?? 0, deleted });
});
