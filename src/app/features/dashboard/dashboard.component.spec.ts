import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DiscordServerControllerService, DiscordUserControllerService } from '@dungeon-hub/api-client';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { CdnService } from '../../core/services/cdn.service';
import { DiscordGuild } from '../../core/services/discord-guild.service';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import { DashboardComponent, categorizeGuilds, formatLinkedUserCount } from './dashboard.component';

describe('formatLinkedUserCount', () => {
  it('groups linked user counts without converting them to a number', () => {
    expect(formatLinkedUserCount('123456789012345678')).toBe('123,456,789,012,345,678');
  });
});

describe('DashboardComponent global stats', () => {
  const countLinkedUsers = vi.fn();

  beforeEach(async () => {
    countLinkedUsers.mockReset();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUserInfo: () => ({}) } },
        { provide: DiscordServerControllerService, useValue: { getAllServers: () => of([]) } },
        { provide: DiscordUserControllerService, useValue: { countLinkedUsers } },
        { provide: DiscordGuildService, useValue: { getAllGuilds: () => [] } },
        { provide: CdnService, useValue: {} },
      ],
    }).compileComponents();
  });

  it('loads and displays linked users', () => {
    countLinkedUsers.mockReturnValue(of('12345'));
    const fixture = TestBed.createComponent(DashboardComponent);

    fixture.componentInstance.loadGlobalStats();
    fixture.detectChanges();

    expect(fixture.componentInstance.globalStatsLoading).toBe(false);
    expect(fixture.componentInstance.linkedUsers).toBe('12,345');
    expect(fixture.nativeElement.textContent).toContain('12,345');
    expect(fixture.nativeElement.textContent).toContain('Discord users linked to their Minecraft account');
  });

  it('shows placeholders for carry and ticket time spans and trends', () => {
    countLinkedUsers.mockReturnValue(of('12345'));
    const fixture = TestBed.createComponent(DashboardComponent);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Completed carries');
    expect(text).toContain('Total created tickets');
    expect(text).toContain('Lifetime');
    expect(text).toContain('Last 30 days');
    expect(text).toContain('Last 7 days');
    expect(text).toContain('Trend comparisons are not implemented yet and are coming soon.');
  });

  it('shows request errors and retries the request', () => {
    const firstRequest = new Subject<string>();
    countLinkedUsers.mockReturnValueOnce(firstRequest).mockReturnValueOnce(of('42'));
    const fixture = TestBed.createComponent(DashboardComponent);

    fixture.componentInstance.loadGlobalStats();
    firstRequest.error(new Error('unavailable'));
    expect(fixture.componentInstance.globalStatsError).toBe(true);

    fixture.componentInstance.loadGlobalStats();
    expect(countLinkedUsers).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.globalStatsError).toBe(false);
    expect(fixture.componentInstance.linkedUsers).toBe('42');
  });

  it('cancels an outstanding request when destroyed', () => {
    const request = new Subject<string>();
    countLinkedUsers.mockReturnValue(request);
    const fixture = TestBed.createComponent(DashboardComponent);

    fixture.componentInstance.loadGlobalStats();
    expect(request.observed).toBe(true);

    fixture.destroy();
    expect(request.observed).toBe(false);
  });
});

describe('categorizeGuilds', () => {
  it('separates editable, inviteable, and view-only guilds', () => {
    const guilds: DiscordGuild[] = [
      { id: 'editable', name: 'Editable', icon: null },
      { id: 'invite', name: 'Invite', icon: null },
      { id: 'view', name: 'View', icon: null },
      { id: 'unavailable', name: 'Unavailable', icon: null }
    ];

    const result = categorizeGuilds(
      guilds,
      new Set(['editable', 'invite']),
      new Set(['editable', 'view'])
    );

    expect(result.editable.map(guild => guild.id)).toEqual(['editable']);
    expect(result.needingInvite.map(guild => guild.id)).toEqual(['invite']);
    expect(result.viewOnly.map(guild => guild.id)).toEqual(['view']);
  });
});
