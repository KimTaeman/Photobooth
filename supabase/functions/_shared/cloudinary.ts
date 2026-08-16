export function requiredCloudinaryEnv() {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret)
    throw new Error('Cloudinary server secrets are not configured');
  return { cloudName, apiKey, apiSecret };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadSignature(
  publicId: string,
  timestamp: number,
  apiSecret: string,
): Promise<string> {
  const parameters = `invalidate=true&overwrite=false&public_id=${publicId}&timestamp=${timestamp}`;
  return sha256Hex(parameters + apiSecret);
}
