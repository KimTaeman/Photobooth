import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMOTE_CONFIG,
  cacheRemoteConfig,
  parseRemoteConfigRows,
  readCachedRemoteConfig,
} from './remoteConfig';

describe('remote configuration', () => {
  it('parses and validates database rows', () => {
    const config = parseRemoteConfigRows([
      { key: 'theme', value: 'cute' },
      { key: 'countdown_duration', value: '7' },
      { key: 'enable_video', value: 'false' },
      { key: 'available_frames', value: '["/frame1.png"]' },
    ]);

    expect(config.theme).toBe('cute');
    expect(config.countdownDuration).toBe(7);
    expect(config.enableVideo).toBe(false);
    expect(config.availableFrames).toEqual(['/frame1.png']);
  });

  it('rejects unsafe or malformed configuration', () => {
    expect(() =>
      parseRemoteConfigRows([
        { key: 'countdown_duration', value: '9999' },
        { key: 'available_frames', value: '["https://tracker.example/frame.png"]' },
      ]),
    ).toThrow('Remote settings failed validation');
  });

  it('round-trips only validated cached data', () => {
    const storage = window.localStorage;
    storage.clear();
    cacheRemoteConfig(DEFAULT_REMOTE_CONFIG, storage);
    expect(readCachedRemoteConfig(storage)).toEqual(DEFAULT_REMOTE_CONFIG);
    storage.setItem('photobooth.settings.v1', '{"version":1,"settings":{}}');
    expect(readCachedRemoteConfig(storage)).toBeNull();
  });
});
