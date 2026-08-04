import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { StatsControllerService } from '@dungeon-hub/api-client';
import { Observable, Subscription } from 'rxjs';

export function formatLinkedUserCount(value: string | number | null | undefined): string {
  return String(value ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type PeriodKey = 'lifetime' | 'last30Days' | 'last7Days';

interface PeriodStat {
  lifetime?: string | number | null;
  total?: string | number | null;
  allTime?: string | number | null;
  last30Days?: string | number | null;
  thirtyDays?: string | number | null;
  last7Days?: string | number | null;
  sevenDays?: string | number | null;
}

interface GlobalStatsApiResponse {
  linkedUsers?: string | number | null;
  completedCarries?: PeriodStat | string | number | null;
  totalCreatedTickets?: PeriodStat | string | number | null;
  createdTickets?: PeriodStat | string | number | null;
  uniqueCarriers?: PeriodStat | string | number | null;
  totalFlaggedUsers?: PeriodStat | string | number | null;
  flaggedUsers?: PeriodStat | string | number | null;
}

interface GlobalStatCard {
  borderClass: string;
  titleClass: string;
  title: string;
  description: string;
  stat: PeriodStat | string | number | null | undefined;
}

const COMING_SOON = 'Coming soon';

function pickStatValue(
  stat: PeriodStat | string | number | null | undefined,
  key: PeriodKey,
): string {
  if (stat === null || stat === undefined) return COMING_SOON;
  if (typeof stat === 'string' || typeof stat === 'number') {
    return key === 'lifetime' ? formatLinkedUserCount(stat) : COMING_SOON;
  }

  const value =
    key === 'lifetime'
      ? (stat.lifetime ?? stat.total ?? stat.allTime)
      : key === 'last30Days'
        ? (stat.last30Days ?? stat.thirtyDays)
        : (stat.last7Days ?? stat.sevenDays);

  return value === null || value === undefined ? COMING_SOON : formatLinkedUserCount(value);
}

@Component({
  selector: 'app-global-stats',
  standalone: true,
  template: `
    <section aria-labelledby="global-stats-heading">
      <h2 id="global-stats-heading" class="text-2xl font-bold mb-4">Global Stats</h2>
      @if (loading) {
        <div class="card text-center py-8" aria-live="polite">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
          ></div>
          <p class="mt-3 text-gray-400">Loading global stats...</p>
        </div>
      } @else if (error) {
        <div class="card bg-red-900/20 border-red-500 text-center py-8" role="alert">
          <p class="text-red-400 font-semibold">Unable to load global stats</p>
          <button type="button" (click)="loadStats()" class="btn btn-secondary mt-4">Retry</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
          <article class="card border-blue-500/40">
            <p class="text-sm font-medium uppercase tracking-wide text-blue-400">Linked users</p>
            <p class="mt-3 text-3xl font-bold">{{ linkedUsers }}</p>
            <p class="mt-2 text-sm text-gray-400">
              Discord users linked to their Minecraft account
            </p>
          </article>
          @for (card of statCards; track card.title) {
            <article class="card {{ card.borderClass }}">
              <p class="text-sm font-medium uppercase tracking-wide {{ card.titleClass }}">
                {{ card.title }}
              </p>
              <dl class="mt-3 space-y-3">
                @for (period of periods; track period.key) {
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-gray-400">{{ period.label }}</dt>
                    <dd class="font-semibold">{{ getPeriodValue(card.stat, period.key) }}</dd>
                  </div>
                }
              </dl>
              @if (card.description) {
                <p class="mt-4 text-sm text-gray-500">{{ card.description }}</p>
              }
              <p class="mt-2 text-sm text-gray-500">
                Trend comparisons are not implemented yet and are coming soon.
              </p>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class GlobalStatsComponent implements OnInit, OnDestroy {
  private statsService = inject(StatsControllerService);
  private cdr = inject(ChangeDetectorRef);
  private statsSubscription?: Subscription;

  protected linkedUsers = '0';
  protected loading = true;
  protected error = false;
  protected stats: GlobalStatsApiResponse | null = null;
  protected readonly periods: { key: PeriodKey; label: string }[] = [
    { key: 'lifetime', label: 'Lifetime' },
    { key: 'last30Days', label: 'Last 30 days' },
    { key: 'last7Days', label: 'Last 7 days' },
  ];

  protected get statCards(): GlobalStatCard[] {
    return [
      {
        borderClass: 'border-purple-500/40',
        titleClass: 'text-purple-400',
        title: 'Completed carries',
        description: '',
        stat: this.stats?.completedCarries,
      },
      {
        borderClass: 'border-cyan-500/40',
        titleClass: 'text-cyan-400',
        title: 'Total created tickets',
        description: '',
        stat: this.stats?.totalCreatedTickets ?? this.stats?.createdTickets,
      },
      {
        borderClass: 'border-emerald-500/40',
        titleClass: 'text-emerald-400',
        title: 'Unique carriers',
        description: 'People who gained score by completing at least one carry.',
        stat: this.stats?.uniqueCarriers,
      },
      {
        borderClass: 'border-rose-500/40',
        titleClass: 'text-rose-400',
        title: 'Total flagged users',
        description: 'Users flagged for illegitimate or harmful activity',
        stat: this.stats?.totalFlaggedUsers ?? this.stats?.flaggedUsers,
      },
    ];
  }

  // TODO: Remove this comment when global trend statistics are implemented. Request twice
  // the displayed period (60 days for a 30-day trend, or 14 days for a 7-day trend), subtract
  // the current period from that total to obtain the preceding period, then calculate the
  // percentage change as (current - preceding) / preceding * 100. The zero-preceding-period
  // case needs an explicit new-activity state rather than an infinite percentage.

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.statsSubscription?.unsubscribe();
  }

  protected getPeriodValue(
    stat: PeriodStat | string | number | null | undefined,
    key: PeriodKey,
  ): string {
    return pickStatValue(stat, key);
  }

  protected loadStats(): void {
    this.statsSubscription?.unsubscribe();
    this.loading = true;
    this.error = false;

    this.statsSubscription = this.loadGlobalStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.linkedUsers = formatLinkedUserCount(stats.linkedUsers);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      },
    });
  }

  private loadGlobalStats(): Observable<GlobalStatsApiResponse> {
    return this.statsService.getGlobalStats() as Observable<GlobalStatsApiResponse>;
  }
}
