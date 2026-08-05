import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { StatsControllerService } from '@dungeon-hub/api-client';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import { ServerStatsComponent, formatCompactValue } from './server-stats.component';

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
  it('requests and displays the new server stats endpoint for the current user', async () => {
    const getServerStats = vi.fn().mockReturnValue(
      of({
        totalMoneySpent: '1000',
        totalCarries: '2000',
        totalTickets: '4000',
        totalCarriers: '50',
        totalScore: '3000',
        activeWarns: 2,
        totalWarns: 10,
        yourMoneySpent: '6000',
        yourMoneyEarned: '7000',
        yourCompletedCarries: 1250,
        yourBoughtCarries: '9',
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) },
        },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        { provide: StatsControllerService, useValue: { getServerStats } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.grid')?.classList.contains('xl:grid-cols-5')).toBe(
      true,
    );
    expect(getServerStats).toHaveBeenCalledWith('server-1');
    expect((fixture.componentInstance as any).stats.yourCompletedCarries).toBe(1250);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total carries');
    expect(text).toContain('Completed on this server');
    expect(text).toContain('Your completed carries');
    expect(text).toContain('1.25k');
    expect(text).toContain('Total carriers');
    expect(text).toContain('50');
    expect(text).toContain('People who gained score by completing at least one carry');
    expect(text).toContain('Total score');
    expect(text).toContain('3k');
    expect(text).toContain('Points earned by the service team');
    expect(text).toContain('Your bought carries');
    expect(text).toContain('9');
    expect(text).toContain('Received as a customer on this server');
    expect(text).toContain('Total warns given');
    expect(text).toContain('10 (2 active)');
    expect(text).toContain('Warnings issued on this server');
  });

  it('keeps the page-level error when the server stats endpoint fails', async () => {
    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ serverId: 'server-1' })) },
        },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        {
          provide: StatsControllerService,
          useValue: { getServerStats: () => throwError(() => new Error('unavailable')) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.stats).toBeNull();
    expect(component.error).toBe(
      'The statistics service did not return a result. Please try again.',
    );
    expect(fixture.nativeElement.textContent).toContain('Unable to load stats');
  });

  it('does not request stats when the server cannot be identified', async () => {
    const getServerStats = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ServerStatsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({})) },
        },
        { provide: DiscordGuildService, useValue: { getGuildById: () => undefined } },
        { provide: StatsControllerService, useValue: { getServerStats } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServerStatsComponent);
    fixture.detectChanges();

    expect(getServerStats).not.toHaveBeenCalled();
    expect((fixture.componentInstance as any).error).toBe('Your server could not be identified.');
    expect(fixture.nativeElement.textContent).toContain('Unable to load stats');
  });
});
