import { TestBed } from '@angular/core/testing';
import { DiscordUserControllerService } from '@dungeon-hub/api-client';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalStatsComponent, formatLinkedUserCount } from './global-stats.component';

describe('formatLinkedUserCount', () => {
  it('groups linked user counts without converting them to a number', () => {
    expect(formatLinkedUserCount('123456789012345678')).toBe('123,456,789,012,345,678');
  });
});

describe('GlobalStatsComponent', () => {
  const countLinkedUsers = vi.fn();

  beforeEach(async () => {
    countLinkedUsers.mockReset();
    await TestBed.configureTestingModule({
      imports: [GlobalStatsComponent],
      providers: [
        { provide: DiscordUserControllerService, useValue: { countLinkedUsers } },
      ],
    }).compileComponents();
  });

  it('loads linked users and displays every global statistic', () => {
    countLinkedUsers.mockReturnValue(of('12345'));
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12,345');
    expect(text).toContain('Discord users linked to their Minecraft account');
    expect(text).toContain('Completed carries');
    expect(text).toContain('Total created tickets');
    expect(text).toContain('Unique carriers');
    expect(text).toContain('Lifetime');
    expect(text).toContain('Last 30 days');
    expect(text).toContain('Last 7 days');
  });

  it('shows errors and retries through the rendered button', () => {
    const firstRequest = new Subject<string>();
    countLinkedUsers.mockReturnValueOnce(firstRequest).mockReturnValueOnce(of('42'));
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();
    firstRequest.error(new Error('unavailable'));
    expect(fixture.nativeElement.textContent).toContain('Unable to load global stats');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(countLinkedUsers).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('renders loading and cancels the request when destroyed', () => {
    const request = new Subject<string>();
    countLinkedUsers.mockReturnValue(request);
    const fixture = TestBed.createComponent(GlobalStatsComponent);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading global stats...');
    expect(request.observed).toBe(true);

    fixture.destroy();
    expect(request.observed).toBe(false);
  });
});
