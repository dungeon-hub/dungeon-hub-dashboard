import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { DiscordServerControllerService, DiscordUserControllerService } from '@dungeon-hub/api-client';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import { ServerStatsComponent, formatCompactValue, getDiscordUserId } from './server-stats.component';

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

  it('expands numeric exponent notation before applying compact suffixes', () => {
    expect(formatCompactValue(1e21)).toBe('1000000000t');
    expect(formatCompactValue(1e-7)).toBe('0.0000001');
    expect(formatCompactValue(-1.25e4)).toBe('-12.5k');
  });
});

describe('ServerStatsComponent carry count', () => {
  it('requests and displays the current user carry count for the server', async () => {
    const getCarryCount = vi.fn().mockReturnValue(of(1250));
    const token = tokenWithPayload('{"discord-id":"356134481452597250"}');

    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) } },
        { provide: AuthService, useValue: { getIdToken: () => token } },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        {
          provide: DiscordServerControllerService,
          useValue: {
            getTotalAmountOfMoneySpentOnServices: () => of('0'),
            countCarries: () => of('0'),
          },
        },
        { provide: DiscordUserControllerService, useValue: { getCarryCount } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.xl\\:grid-cols-5')).toBeTruthy();
    expect(getCarryCount).toHaveBeenCalledWith('356134481452597250', 'server-1');
    expect((fixture.componentInstance as any).stats.userCarryCount).toBe(1250);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Your completed carries');
    expect(text).toContain('1.25k');
    expect(text).toContain('Total carriers');
    expect(text).toContain('People who gained score by completing at least one carry');
    expect(text).toContain('Total score');
    expect(text).toContain('Points earned by carriers based on carry difficulty');
    expect(text).toContain('Your bought carries');
    expect(text).toContain('Received as a customer on this server');
  });

  it('preserves the other stats when the user carry count request fails', async () => {
    const token = tokenWithPayload('{"discord-id":"356134481452597250"}');

    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) } },
        { provide: AuthService, useValue: { getIdToken: () => token } },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        {
          provide: DiscordServerControllerService,
          useValue: {
            getTotalAmountOfMoneySpentOnServices: (_server: string, user?: string, carrier?: string) =>
              of(user ? '2000' : carrier ? '3000' : '1000'),
            countCarries: () => of('4'),
          },
        },
        {
          provide: DiscordUserControllerService,
          useValue: { getCarryCount: () => throwError(() => new Error('unavailable')) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.error).toBe('');
    expect(component.stats).toEqual({
      totalMoneySpent: '1000',
      totalCarries: '4',
      userMoneySpent: '2000',
      userMoneyEarned: '3000',
      userCarryCount: null,
    });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total money spent');
    expect(text).toContain('1k');
    expect(text).toContain('Your completed carries');
    expect(text).toContain('Coming soon');
  });

  it('keeps the page-level error when a primary server stats request fails', async () => {
    const token = tokenWithPayload('{"discord-id":"356134481452597250"}');

    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) } },
        { provide: AuthService, useValue: { getIdToken: () => token } },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        {
          provide: DiscordServerControllerService,
          useValue: {
            getTotalAmountOfMoneySpentOnServices: () => throwError(() => new Error('unavailable')),
            countCarries: () => of('4'),
          },
        },
        { provide: DiscordUserControllerService, useValue: { getCarryCount: () => of(2) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.stats).toBeNull();
    expect(component.error).toBe('The statistics service did not return a result. Please try again.');
    expect(fixture.nativeElement.textContent).toContain('Unable to load stats');
  });

  it('does not request stats when the Discord user cannot be identified', async () => {
    const countCarries = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) } },
        { provide: AuthService, useValue: { getIdToken: () => null } },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        { provide: DiscordServerControllerService, useValue: { countCarries } },
        { provide: DiscordUserControllerService, useValue: {} },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    expect(countCarries).not.toHaveBeenCalled();
    expect((fixture.componentInstance as any).error).toBe(
      'Your server or Discord user could not be identified.',
    );
    expect(fixture.nativeElement.textContent).toContain('Unable to load stats');
  });
});
