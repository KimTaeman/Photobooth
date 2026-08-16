import { describe, expect, it } from 'vitest';
import {
  isQueueFileExpired,
  MAX_QUEUE_AGE_MS,
  parseQueueMetadata,
  retryDelay,
} from './useUploadQueue';

describe('upload queue privacy and retry rules', () => {
  it('expires files exactly at the 24-hour boundary', () => {
    const now = Date.now();
    expect(isQueueFileExpired(`${now - MAX_QUEUE_AGE_MS}_id.jpg`, null, null, now)).toBe(true);
    expect(isQueueFileExpired(`${now - MAX_QUEUE_AGE_MS + 1}_id.jpg`, null, null, now)).toBe(false);
  });

  it('uses capped exponential backoff with jitter', () => {
    expect(retryDelay(0, () => 0)).toBe(1_000);
    expect(retryDelay(3, () => 0)).toBe(8_000);
    expect(retryDelay(20, () => 0)).toBe(300_000);
  });

  it('upgrades valid legacy metadata and rejects malformed entries', () => {
    const items = parseQueueMetadata([
      {
        id: '1700000000000_uuid',
        sessionId: 'session_id',
        type: 'image',
        filename: 'session_id_clip',
        localPath: 'upload_queue/file.gif',
        retryCount: 1,
      },
      { id: 'broken' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].mimeType).toBe('image/gif');
    expect(items[0].createdAt).toBe(1_700_000_000_000);
  });
});
