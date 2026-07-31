import { describe, expect, it } from 'vitest';
import { getDiscordUserId } from './server-stats.component';

describe('getDiscordUserId', () => {
  it('reads the Discord id claim', () => {
    expect(getDiscordUserId({ 'discord-id': '123' })).toBe('123');
  });

  it('returns an empty string when the Discord id claim is not present', () => {
    expect(getDiscordUserId(null)).toBe('');
    expect(getDiscordUserId({ sub: 'not-a-discord-id' })).toBe('');
  });
});
