export { CLOUDINARY_CLOUD_NAME } from '../config/env';
import { supabase } from './useSupabase';

export type CloudinaryResourceType = 'image' | 'video' | 'raw';

interface SignedUpload {
  assetId: string;
  apiKey: string;
  cloudName: string;
  publicId: string;
  signature: string;
  timestamp: number;
}

export interface CloudinaryUploadResponse {
  asset_id: string;
  bytes: number;
  format: string;
  height?: number;
  public_id: string;
  resource_type: CloudinaryResourceType;
  secure_url: string;
  width?: number;
}

function assetKind(filename: string): 'photo' | 'gif' | 'video' {
  if (filename.endsWith('_clip')) return 'gif';
  if (filename.endsWith('_video')) return 'video';
  return 'photo';
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `Cloudinary upload failed (${response.status})`;
  } catch {
    return `Cloudinary upload failed (${response.status})`;
  }
}

export async function uploadToCloudinary(
  file: Blob | string,
  resourceType: CloudinaryResourceType,
  filename: string,
  sessionId = filename.replace(/_(?:shot_[1-4]|final|clip|video)$/, ''),
): Promise<CloudinaryUploadResponse | { public_id: string; alreadyUploaded: true }> {
  const bytes = typeof file === 'string' ? file.length : file.size;
  const mimeType = typeof file === 'string' ? 'text/plain' : file.type;
  const { data: signed, error: signingError } = await supabase.functions.invoke<SignedUpload>(
    'cloudinary-sign',
    {
      body: {
        sessionId,
        filename,
        resourceType,
        assetKind: assetKind(filename),
        bytes,
        mimeType,
      },
    },
  );

  if (signingError || !signed) {
    throw new Error(signingError?.message ?? 'Upload authorization failed');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signed.apiKey);
  formData.append('timestamp', signed.timestamp.toString());
  formData.append('signature', signed.signature);
  formData.append('public_id', signed.publicId);
  formData.append('overwrite', 'false');
  formData.append('invalidate', 'true');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    const message = await readError(response);
    if (/already exists/i.test(message)) {
      await supabase.functions.invoke('cloudinary-complete', {
        body: { assetId: signed.assetId, alreadyUploaded: true },
      });
      return { public_id: signed.publicId, alreadyUploaded: true };
    }
    throw new Error(message);
  }

  const uploaded = (await response.json()) as CloudinaryUploadResponse;
  const { error: completionError } = await supabase.functions.invoke('cloudinary-complete', {
    body: {
      assetId: signed.assetId,
      upload: {
        assetId: uploaded.asset_id,
        publicId: uploaded.public_id,
        secureUrl: uploaded.secure_url,
        format: uploaded.format,
        bytes: uploaded.bytes,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
      },
    },
  });

  // The upload succeeded. Keep the media available and let the retention job
  // reconcile a pending record instead of duplicating a completed upload.
  if (completionError) {
    console.warn('Media uploaded, but metadata confirmation is pending.', completionError);
  }

  return uploaded;
}
