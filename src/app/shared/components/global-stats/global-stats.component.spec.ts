import { TestBed } from '@angular/core/testing';
import { StatsControllerService } from '@dungeon-hub/api-client';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalStatsComponent, formatLinkedUserCount } from './global-stats.component';

describe('formatLinkedUserCount', () => {
  it('groups linked user counts without converting them to a number', () => {
    expect(formatLinkedUserCount('123456789012345678')).toBe('123,456,789,012,345,678');
  });
});

describe('GlobalStatsComponent', () => {
  const getGlobalStats = vi.fn();

  beforeEach(async () => {
    getGlobalStats.mockReset();
    await TestBed.configureTestingModule({
      imports: [GlobalStatsComponent],
      providers: [{ provide: StatsControllerService, useValue: { getGlobalStats } }],
    }).compileComponents();
  });

  it('loads linked users and displays every global statistic', () => {
    getGlobalStats.mockReturnValue(
      of({
        linkedUsers: '12345',
        carryStats: {
          lifetime: '1000000',
          last60Days: '600',
          last30Days: '300',
          last14Days: '140',
          last7Days: '70',
        },
        ticketStatsModel: {
          lifetime: '500',
          last60Days: '100',
          last30Days: '50',
          last14Days: '14',
          last7Days: '7',
        },
        carrierStatsModel: {
          lifetime: '42',
          last60Days: '20',
          last30Days: '10',
          last14Days: '5',
          last7Days: '3',
        },
        totalFlaggedUsers: '4',
      }),
    );
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12,345');
    expect(text).toContain('Discord users linked to their Minecraft account');
    expect(getGlobalStats).toHaveBeenCalledOnce();
    expect(text).toContain('Completed carries');
    expect(text).toContain('1,000,000');
    expect(text).toContain('Total created tickets');
    expect(text).toContain('500');
    expect(fixture.nativeElement.querySelector('.grid')?.classList.contains('xl:grid-cols-5')).toBe(
      true,
    );
    expect(text).toContain('Unique carriers');
    expect(text).toContain('Total flagged users');
    expect(text).toContain('Users flagged for illegitimate or harmful activity');
    expect(text).toContain('Lifetime');
    expect(text).toContain('Last 30 days');
    expect(text).toContain('Last 7 days');
  });

  it('shows errors and retries through the rendered button', () => {
    const firstRequest = new Subject<any>();
    getGlobalStats.mockReturnValueOnce(firstRequest).mockReturnValueOnce(of({ linkedUsers: '42' }));
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();
    firstRequest.error(new Error('unavailable'));
    expect(fixture.nativeElement.textContent).toContain('Unable to load global stats');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(getGlobalStats).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('renders loading and cancels the request when destroyed', () => {
    const request = new Subject<any>();
    getGlobalStats.mockReturnValue(request);
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading global stats...');
    expect(request.observed).toBe(true);

    fixture.destroy();
    expect(request.observed).toBe(false);
  });
});
