import { describe, expect, it } from 'vitest';
import { makeShareUrl } from './env';

describe('share URL construction', () => {
  it('encodes the session and includes optional media flags', () => {
    expect(makeShareUrl('https://booth.example', 'session_1/2', true)).toBe(
      'https://booth.example/#/summer-splash?id=session_1%2F2&v=1&g=1',
    );
  });
});
