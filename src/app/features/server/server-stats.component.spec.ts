import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { DiscordServerControllerService } from '@dungeon-hub/api-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import {
  formatCompactValue,
  getDiscordUserId,
  ServerStatsComponent,
} from './server-stats.component';

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
});

describe('ServerStatsComponent carry count', () => {
  it('cancels an active request and clears stats when routing to a missing server ID', async () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ serverId: 'server-1' }));
    const activeRequest = new Subject<string>();
    const service = {
      getTotalAmountOfMoneySpentOnServices: vi.fn(() => activeRequest),
      countCarries: vi.fn(() => activeRequest),
    };

    TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap } },
        {
          provide: AuthService,
          useValue: { getIdToken: () => tokenWithPayload('{"discord-id":1}') },
        },
        {
          provide: DiscordGuildService,
          useValue: {
            getGuildById: () => undefined,
            getDisplayName: (guild: { name: string }) => guild.name,
          },
        },
        { provide: DiscordServerControllerService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();
    await Promise.resolve();
    const instance = fixture.componentInstance as unknown as {
      stats: unknown;
      loading: boolean;
      error: string;
    };

    paramMap.next(convertToParamMap({}));
    fixture.detectChanges();
    await Promise.resolve();
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(activeRequest.observed).toBe(false);
    expect(instance.stats).toBeNull();
    expect(instance.loading).toBe(false);
    expect(instance.error).toBe('Your server or Discord user could not be identified.');
  });
});
