import { describe, expect, it } from 'vitest';
import { formatCompactValue, getDiscordUserId } from './server-stats.component';

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

describe('formatCompactValue', () => {
  it('only adds a suffix at or above its threshold', () => {
    expect(formatCompactValue('999')).toBe('999');
    expect(formatCompactValue('1000')).toBe('1k');
  });

  it('uses only the highest applicable suffix', () => {
    expect(formatCompactValue('1234567')).toBe('1.2346m');
    expect(formatCompactValue('1234567890')).toBe('1.2346b');
    expect(formatCompactValue('1234567890123')).toBe('1.2346t');
  });

  it('rounds to at most four decimal places without losing precision', () => {
    expect(formatCompactValue('356134481452597250')).toBe('356134.4815t');
    expect(formatCompactValue('1500.25')).toBe('1.5003k');
  });

  it('formats numeric API results', () => {
    expect(formatCompactValue(1250)).toBe('1.25k');
  });
});
