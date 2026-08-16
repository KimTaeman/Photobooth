function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Vite environment variable: ${name}`);
  }

  return value;
}

function requiredHttpUrl(name: keyof ImportMetaEnv): string {
  const value = requiredEnv(name);

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:')) {
      throw new Error('production URLs must use HTTPS');
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid URL';
    throw new Error(`Invalid ${name}: ${reason}`);
  }
}

export const SUPABASE_URL = requiredHttpUrl('VITE_SUPABASE_URL');
export const SUPABASE_PUBLISHABLE_KEY = requiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
export const CLOUDINARY_CLOUD_NAME = requiredEnv('VITE_CLOUDINARY_CLOUD_NAME');
export const PUBLIC_SHARE_URL = requiredHttpUrl('VITE_PUBLIC_SHARE_URL');

export function makeShareUrl(publicShareUrl: string, sessionId: string, hasVideo: boolean): string {
  const videoQuery = hasVideo ? '&v=1' : '';
  return `${publicShareUrl}/#/summer-splash?id=${encodeURIComponent(sessionId)}${videoQuery}&g=1`;
}

export function buildShareUrl(sessionId: string, hasVideo: boolean): string {
  return makeShareUrl(PUBLIC_SHARE_URL, sessionId, hasVideo);
}
