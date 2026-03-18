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
