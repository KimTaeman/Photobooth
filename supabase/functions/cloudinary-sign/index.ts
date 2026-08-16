import { requireOperator, serviceClient } from '../_shared/auth.ts';
import { requiredCloudinaryEnv, uploadSignature } from '../_shared/cloudinary.ts';
import { corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts';

type ResourceType = 'image' | 'video' | 'raw';
type AssetKind = 'photo' | 'gif' | 'video';

interface SignBody {
  sessionId?: unknown;
  filename?: unknown;
  resourceType?: unknown;
  assetKind?: unknown;
  bytes?: unknown;
  mimeType?: unknown;
}

const SESSION_PATTERN =
  /^session_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'Origin not allowed' }, 403);

  try {
    const user = await requireOperator(request);
    const body = (await request.json()) as SignBody;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const filename = typeof body.filename === 'string' ? body.filename : '';
    const resourceType = body.resourceType as ResourceType;
    const assetKind = body.assetKind as AssetKind;
    const bytes = typeof body.bytes === 'number' ? body.bytes : -1;
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

    if (!SESSION_PATTERN.test(sessionId)) throw new Error('Invalid session identifier');
    if (!new RegExp(`^${sessionId}_(?:shot_[1-4]|final|clip|video)$`).test(filename)) {
      throw new Error('Invalid asset identifier');
    }
    if (!['image', 'video', 'raw'].includes(resourceType)) throw new Error('Invalid resource type');
    if (!['photo', 'gif', 'video'].includes(assetKind)) throw new Error('Invalid asset kind');
    const maximum = resourceType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > maximum)
      throw new Error('File size is not allowed');
    if (resourceType === 'image' && !['image/jpeg', 'image/gif', 'image/png'].includes(mimeType))
      throw new Error('Image type is not allowed');
    if (resourceType === 'video' && !['video/webm', 'video/mp4'].includes(mimeType))
      throw new Error('Video type is not allowed');

    const service = serviceClient();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countError } = await service
      .from('upload_authorizations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (countError) throw countError;
    if ((count ?? 0) >= 60) return json(request, { error: 'Upload rate limit exceeded' }, 429);

    const [{ data: session }, authorization] = await Promise.all([
      service.from('sessions').select('id').eq('id', sessionId).maybeSingle(),
      service.from('upload_authorizations').insert({ user_id: user.id, session_id: sessionId }),
    ]);
    if (authorization.error) throw authorization.error;
    if (!session)
      return json(request, { error: 'Session must be recorded before media upload' }, 409);

    const { data: asset, error: assetError } = await service
      .from('media_assets')
      .upsert(
        {
          session_id: sessionId,
          public_id: filename,
          resource_type: resourceType,
          asset_kind: assetKind,
          mime_type: mimeType,
          byte_size: bytes,
          status: 'pending',
          authorized_by: user.id,
        },
        { onConflict: 'public_id' },
      )
      .select('id')
      .single();
    if (assetError) throw assetError;

    const { cloudName, apiKey, apiSecret } = requiredCloudinaryEnv();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await uploadSignature(filename, timestamp, apiSecret);
    return json(request, {
      assetId: asset.id,
      apiKey,
      cloudName,
      publicId: filename,
      signature,
      timestamp,
    });
  } catch (error) {
    console.error('cloudinary-sign failed', error instanceof Error ? error.message : error);
    return json(
      request,
      { error: error instanceof Error ? error.message : 'Upload authorization failed' },
      400,
    );
  }
});
