import { createClient } from '@supabase/supabase-js';

const _s = [
    'aHR0cHM6Ly95emVvcmZ5Z211Ymd5dWtleXBzeC5zdXBhYmFzZS5jbw==',
    'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5sNlpXOXlabmxuYlhWaVozbDFhMlY1Y0hONElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpNeU1EazBNVFVzSW1WNGNDSTZNakE0T0RjNE5UUXhOWDAuS1M2Y2JjMy1VME1JLVYzQS04c2FZUUZUTkVhNWdCbkdFR21QcUdzSlZudw=='
];

export const SUPABASE_URL = atob(_s[0]);
export const SUPABASE_ANON_KEY = atob(_s[1]);
export const STORAGE_BUCKET = 'photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PASSWORD_HASH = '9cb4b10ff9c97ada0fc9cdc5c8fd6992c6d5d707fa2565f951aa7762d8a5f4e7';

export async function sha256(text: string) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Requires a `settings` table:
// CREATE TABLE settings (
//   key text PRIMARY KEY,
//   value text
// );
export async function getSetting(key: string, defaultValue: string): Promise<string> {
    try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
        if (error) {
            console.warn(`Setting ${key} not found, using default: ${defaultValue}`, error);
            return defaultValue;
        }
        return data?.value ?? defaultValue;
    } catch (err) {
        console.error(`Error fetching setting ${key}:`, err);
        return defaultValue;
    }
}

export async function updateSetting(key: string, value: string) {
    try {
        const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        if (error) throw error;
    } catch (err) {
        console.error(`Failed to update setting ${key}:`, err);
        throw err; // Re-throw to handle in UI
    }
}

export async function logSession(sessionId: string, frame: string | null, hasVideo: boolean) {
    try {
        const { error } = await supabase.from('sessions').insert({ id: sessionId, frame, has_video: hasVideo });
        if (error) throw error;
    } catch (err) {
        console.error('Failed to log session:', err);
    }
}

