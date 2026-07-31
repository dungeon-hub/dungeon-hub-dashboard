import { describe, expect, it } from 'vitest';
import { getDiscordUserId } from './server-stats.component';

function tokenWithPayload(payload: string): string {
  const encodedPayload = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${encodedPayload}.signature`;
}

describe('getDiscordUserId', () => {
  it('reads the Discord id claim without losing numeric precision', () => {
    const token = tokenWithPayload('{"discord-id":356134481452597250}');

    expect(getDiscordUserId(token)).toBe('356134481452597250');
  });

  it('returns an empty string when the token or Discord id claim is not present', () => {
    expect(getDiscordUserId(null)).toBe('');
    expect(getDiscordUserId(tokenWithPayload('{"sub":"not-a-discord-id"}'))).toBe('');
    expect(getDiscordUserId('not-a-jwt')).toBe('');
  });
});
