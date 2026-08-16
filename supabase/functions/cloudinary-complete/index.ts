import { requireOperator, serviceClient } from '../_shared/auth.ts';
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origin not allowed' }, 403);

  try {
    const user = await requireOperator(request);
    const body = (await request.json()) as {
      assetId?: unknown;
      alreadyUploaded?: unknown;
      upload?: Record<string, unknown>;
    };
    if (typeof body.assetId !== 'string') throw new Error('Invalid asset ID');

    const upload = body.upload ?? {};
    const patch: Record<string, unknown> = {
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
      last_error: null,
    };
    if (typeof upload.assetId === 'string') patch.cloudinary_asset_id = upload.assetId;
    if (typeof upload.publicId === 'string') patch.public_id = upload.publicId;
    if (typeof upload.secureUrl === 'string') patch.secure_url = upload.secureUrl;
    if (typeof upload.format === 'string') patch.format = upload.format;
    if (typeof upload.bytes === 'number') patch.byte_size = upload.bytes;
    if (typeof upload.width === 'number') patch.width = upload.width;
    if (typeof upload.height === 'number') patch.height = upload.height;

    const { error } = await serviceClient()
      .from('media_assets')
      .update(patch)
      .eq('id', body.assetId)
      .eq('authorized_by', user.id);
    if (error) throw error;
    return json(request, { ok: true });
  } catch (error) {
    console.error('cloudinary-complete failed', error instanceof Error ? error.message : error);
    return json(
      request,
      { error: error instanceof Error ? error.message : 'Completion failed' },
      400,
    );
  }
});
