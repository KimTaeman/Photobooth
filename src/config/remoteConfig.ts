import { z } from 'zod';

const layoutSchema = z.object({
  margin: z.number().int().min(0).max(2480),
  gutterX: z.number().int().min(0).max(2480),
  gutterY: z.number().int().min(0).max(1748),
  slotW: z.number().int().positive().max(2480),
  slotH: z.number().int().positive().max(1748),
});

const framePathSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9_./-]+$/)
  .max(200);

export const remoteConfigSchema = z.object({
  eventTheme: z.string().min(1).max(80),
  theme: z.enum(['premium', 'cute']),
  availableFrames: z.array(framePathSchema).min(1).max(20),
  countdownDuration: z.number().int().min(1).max(30),
  captureDelay: z.number().int().min(0).max(30),
  enableVideo: z.boolean(),
  activeFilter: z.string().max(200),
  enablePdpa: z.boolean(),
  pdpaTextEn: z.string().max(5_000),
  pdpaTextTh: z.string().max(5_000),
  enableStickers: z.boolean(),
  enableBoomerang: z.boolean(),
  layout2x2: layoutSchema,
  frameLayouts: z.record(z.string(), layoutSchema),
});

export type RemoteConfig = z.infer<typeof remoteConfigSchema>;

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  eventTheme: 'summer-splash',
  theme: 'premium',
  availableFrames: ['/frame1.png', '/frame2.png', '/frame3.png', '/frame4.png'],
  countdownDuration: 5,
  captureDelay: 3,
  enableVideo: true,
  activeFilter: 'none',
  enablePdpa: false,
  pdpaTextEn:
    'By clicking "Start", you agree to our privacy policy and consent to the collection and use of your personal data (photos) for the purpose of providing this service.',
  pdpaTextTh:
    'โดยการคลิก "เริ่ม" คุณตกลงที่จะยอมรับนโยบายความเป็นส่วนตัวของเราและยินยอมให้มีการเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณ (รูปภาพ) เพื่อวัตถุประสงค์ในการให้บริการนี้',
  enableStickers: true,
  enableBoomerang: true,
  layout2x2: { margin: 210, gutterX: 70, gutterY: 73, slotW: 995, slotH: 681 },
  frameLayouts: {},
};

export interface SettingRow {
  key: string;
  value: string;
}

function parseJson(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseRemoteConfigRows(rows: SettingRow[]): RemoteConfig {
  const settings = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  const candidate = {
    eventTheme: settings.event_theme ?? DEFAULT_REMOTE_CONFIG.eventTheme,
    theme: settings.theme ?? DEFAULT_REMOTE_CONFIG.theme,
    availableFrames: parseJson(settings.available_frames, DEFAULT_REMOTE_CONFIG.availableFrames),
    countdownDuration: parseInteger(
      settings.countdown_duration,
      DEFAULT_REMOTE_CONFIG.countdownDuration,
    ),
    captureDelay: parseInteger(settings.capture_delay, DEFAULT_REMOTE_CONFIG.captureDelay),
    enableVideo:
      settings.enable_video === undefined
        ? DEFAULT_REMOTE_CONFIG.enableVideo
        : settings.enable_video === 'true',
    activeFilter: settings.active_filter ?? DEFAULT_REMOTE_CONFIG.activeFilter,
    enablePdpa:
      settings.enable_pdpa === undefined
        ? DEFAULT_REMOTE_CONFIG.enablePdpa
        : settings.enable_pdpa === 'true',
    pdpaTextEn: settings.pdpa_text_en ?? DEFAULT_REMOTE_CONFIG.pdpaTextEn,
    pdpaTextTh: settings.pdpa_text_th ?? DEFAULT_REMOTE_CONFIG.pdpaTextTh,
    enableStickers:
      settings.enable_stickers === undefined
        ? DEFAULT_REMOTE_CONFIG.enableStickers
        : settings.enable_stickers !== 'false',
    enableBoomerang:
      settings.enable_boomerang === undefined
        ? DEFAULT_REMOTE_CONFIG.enableBoomerang
        : settings.enable_boomerang !== 'false',
    layout2x2: parseJson(settings.layout_2x2, DEFAULT_REMOTE_CONFIG.layout2x2),
    frameLayouts: parseJson(settings.frame_layouts, DEFAULT_REMOTE_CONFIG.frameLayouts),
  };

  const parsed = remoteConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `Remote settings failed validation: ${parsed.error.issues[0]?.message ?? 'invalid value'}`,
    );
  }
  return parsed.data;
}

const SETTINGS_CACHE_KEY = 'photobooth.settings.v1';

const cacheSchema = z.object({
  version: z.literal(1),
  cachedAt: z.number().int().positive(),
  settings: remoteConfigSchema,
});

export function cacheRemoteConfig(config: RemoteConfig, storage: Storage = localStorage): void {
  try {
    storage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ version: 1, cachedAt: Date.now(), settings: config }),
    );
  } catch (error) {
    console.warn('Validated settings could not be cached locally.', error);
  }
}

export function readCachedRemoteConfig(storage: Storage = localStorage): RemoteConfig | null {
  try {
    const raw = storage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = cacheSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.settings : null;
  } catch {
    return null;
  }
}
