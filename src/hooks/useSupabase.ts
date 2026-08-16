import { createClient, type User } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/env';
import {
  cacheRemoteConfig,
  DEFAULT_REMOTE_CONFIG,
  parseRemoteConfigRows,
  readCachedRemoteConfig,
  type RemoteConfig,
  type SettingRow,
} from '../config/remoteConfig';

export type { RemoteConfig } from '../config/remoteConfig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type AppRole = 'admin' | 'operator';

export function getAppRole(user: User | null | undefined): AppRole | null {
  const role = user?.app_metadata?.role;
  return role === 'admin' || role === 'operator' ? role : null;
}

async function signInWithAllowedRoles(
  email: string,
  password: string,
  allowedRoles: AppRole[],
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const role = getAppRole(data.user);
  if (!role || !allowedRoles.includes(role)) {
    await supabase.auth.signOut();
    throw new Error('This account is not authorized for this area.');
  }

  return data.user;
}

export const signInAdmin = (email: string, password: string) =>
  signInWithAllowedRoles(email, password, ['admin']);

export const signInOperator = (email: string, password: string) =>
  signInWithAllowedRoles(email, password, ['operator', 'admin']);

export const signOut = () => supabase.auth.signOut({ scope: 'local' });

export interface ConfigLoadResult {
  config: RemoteConfig;
  source: 'remote' | 'cache' | 'defaults';
}

export async function getAllSettingsResult(): Promise<ConfigLoadResult> {
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;

    const config = parseRemoteConfigRows((data ?? []) as SettingRow[]);
    cacheRemoteConfig(config);
    return { config, source: 'remote' };
  } catch (error) {
    const cached = readCachedRemoteConfig();
    if (cached) {
      console.warn('Supabase settings unavailable; using the last validated configuration.', error);
      return { config: cached, source: 'cache' };
    }

    console.error('Supabase settings unavailable and no cache exists; using defaults.', error);
    return { config: DEFAULT_REMOTE_CONFIG, source: 'defaults' };
  }
}

export async function getAllSettings(): Promise<RemoteConfig> {
  return (await getAllSettingsResult()).config;
}

export async function updateSettings(updates: Record<string, string>): Promise<void> {
  const { error } = await supabase.rpc('update_settings', { updates });
  if (error) throw error;
}

export async function logAdminAction(action: string): Promise<void> {
  const { error } = await supabase.from('admin_logs').insert({ action });
  if (error) throw error;
}

export async function logSession(
  sessionId: string,
  frame: string | null,
  hasVideo: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .insert({ id: sessionId, frame, has_video: hasVideo });

  // A retried queue may race with a session already recorded by the foreground upload.
  if (error && error.code !== '23505') throw error;
}
