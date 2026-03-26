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
            console.warn(`Setting ${key} not found, using default: ${defaultValue}`);
            return defaultValue;
        }
        return data?.value ?? defaultValue;
    } catch (err) {
        console.error(`Error fetching setting ${key}:`, err);
        return defaultValue;
    }
}

export interface RemoteConfig {
    eventTheme: string;
    availableFrames: string[];
    countdownDuration: number;
    captureDelay: number;
    enableVideo: boolean;
    activeFilter: string;
    enablePdpa: boolean;
    pdpaTextEn: string;
    pdpaTextTh: string;
    enableStickers: boolean;
  enableBoomerang: boolean;
    layout2x2?: {
        margin: number;
        gutterX: number;
        gutterY: number;
        slotW: number;
        slotH: number;
    };
    frameLayouts?: Record<string, {
        margin: number;
        gutterX: number;
        gutterY: number;
        slotW: number;
        slotH: number;
    }>;
}

export async function getAllSettings(): Promise<RemoteConfig> {
    const defaultFrames = ['/frame1.png', '/frame2.png', '/frame3.png', '/frame4.png'];
    const defaultLayout = { margin: 210, gutterX: 70, gutterY: 73, slotW: 995, slotH: 681 };
    const defaultPdpaTh = 'โดยการคลิก "เริ่ม" คุณตกลงที่จะยอมรับนโยบายความเป็นส่วนตัวของเราและยินยอมให้มีการเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณ (รูปภาพ) เพื่อวัตถุประสงค์ในการให้บริการนี้';
    const defaultPdpaEn = 'By clicking "Start", you agree to our privacy policy and consent to the collection and use of your personal data (photos) for the purpose of providing this service.';
    
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;

        const settingsMap = (data || []).reduce((acc: Record<string, string>, curr: { key: string; value: string }) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        return {
            eventTheme: settingsMap['event_theme'] || 'summer-splash',
            availableFrames: settingsMap['available_frames'] ? JSON.parse(settingsMap['available_frames']) : defaultFrames,
            countdownDuration: parseInt(settingsMap['countdown_duration'] || '5'),
            captureDelay: parseInt(settingsMap['capture_delay'] || '3'),
            enableVideo: settingsMap['enable_video'] === 'true',
            activeFilter: settingsMap['active_filter'] || 'none',
            enablePdpa: settingsMap['enable_pdpa'] === 'true',
            pdpaTextEn: settingsMap['pdpa_text_en'] || defaultPdpaEn,
            pdpaTextTh: settingsMap['pdpa_text_th'] || defaultPdpaTh,
            enableStickers: settingsMap['enable_stickers'] !== 'false',
            enableBoomerang: settingsMap['enable_boomerang'] !== 'false',
            layout2x2: settingsMap['layout_2x2'] ? JSON.parse(settingsMap['layout_2x2']) : defaultLayout,
            frameLayouts: settingsMap['frame_layouts'] ? JSON.parse(settingsMap['frame_layouts']) : {},
        };
    } catch (err) {
        console.error('Error fetching all settings:', err);
        return {
            eventTheme: 'summer-splash',
            availableFrames: defaultFrames,
            countdownDuration: 5,
            captureDelay: 3,
            enableVideo: true,
            activeFilter: 'none',
            enablePdpa: false,
            pdpaTextEn: defaultPdpaEn,
            pdpaTextTh: defaultPdpaTh,
            enableStickers: true,
            enableBoomerang: true,
            layout2x2: defaultLayout,
        };
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

