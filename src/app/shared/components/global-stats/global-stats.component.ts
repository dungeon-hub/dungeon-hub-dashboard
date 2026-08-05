import {
	ChangeDetectorRef,
	Component,
	inject,
	type OnDestroy,
	type OnInit,
} from "@angular/core";
import { StatsControllerService } from "@dungeon-hub/api-client";
import type { Observable, Subscription } from "rxjs";

export function formatLinkedUserCount(
	value: string | number | null | undefined,
): string {
	return String(value ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type PeriodKey = "lifetime" | "last30Days" | "last7Days";

interface PeriodStat {
	lifetime: string | number;
	last60Days: string | number;
	last30Days: string | number;
	last14Days: string | number;
	last7Days: string | number;
}

interface GlobalStatsApiResponse {
	linkedUsers: string | number;
	carryStats: PeriodStat;
	ticketStatsModel: PeriodStat;
	carrierStatsModel: PeriodStat;
	totalFlaggedUsers: string | number;
}

interface GlobalStatCard {
	borderClass: string;
	titleClass: string;
	title: string;
	description: string;
	stat?: PeriodStat | null;
	singleValue?: string | number | null;
	usesPrecedingWindows?: boolean;
}

const COMING_SOON = "Coming soon";

function numericValue(value: string | number | null | undefined): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function trendPercentage(
	currentValue: string | number,
	previousValue: string | number,
): number {
	const current = numericValue(currentValue);
	const previous = Math.max(numericValue(previousValue), 0);

	if (previous === 0) return current > 0 ? 100 : 0;

	const percentage = ((current - previous) / previous) * 100;
	const magnitude = Math.trunc(Math.abs(percentage) * 10) / 10;
	return percentage < 0 ? -magnitude : magnitude;
}

function formatTrend(percentage: number): string {
	const formatted = Math.abs(percentage).toFixed(1).replace(/\.0$/, "");
	const prefix = percentage > 0 ? "+" : percentage < 0 ? "-" : "";
	return `${prefix}${formatted}%`;
}

function pickStatValue(
	stat: PeriodStat | null | undefined,
	key: PeriodKey,
): string {
	if (stat === null || stat === undefined) return COMING_SOON;

	const value = stat[key];

	return value === null || value === undefined
		? COMING_SOON
		: formatLinkedUserCount(value);
}

@Component({
	selector: "app-global-stats",
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
              @if (card.singleValue !== undefined) {
                <p class="mt-3 text-3xl font-bold">{{ formatStatValue(card.singleValue) }}</p>
              } @else {
                <dl class="mt-3 space-y-3">
                  @for (period of periods; track period.key) {
                    <div class="flex items-center justify-between gap-4">
                      <dt class="text-gray-400">{{ period.label }}</dt>
                      <dd class="text-right">
                        <p class="font-semibold">{{ getPeriodValue(card.stat, period.key) }}</p>
                        @if (getTrendValue(card, period.key); as trend) {
                          <p
                            class="text-xs"
                            [class.text-green-400]="isPositiveTrend(card, period.key)"
                            [class.text-red-400]="isNegativeTrend(card, period.key)"
                            [class.text-gray-500]="isNeutralTrend(card, period.key)"
                          >
                            {{ trend }}
                          </p>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (card.description) {
                <p class="mt-4 text-sm text-gray-500">{{ card.description }}</p>
              }
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

	protected linkedUsers = "0";
	protected loading = true;
	protected error = false;
	protected stats: GlobalStatsApiResponse | null = null;
	protected readonly periods: { key: PeriodKey; label: string }[] = [
		{ key: "lifetime", label: "Lifetime" },
		{ key: "last30Days", label: "Last 30 days" },
		{ key: "last7Days", label: "Last 7 days" },
	];

	protected get statCards(): GlobalStatCard[] {
		return [
			{
				borderClass: "border-purple-500/40",
				titleClass: "text-purple-400",
				title: "Completed carries",
				description: "",
				stat: this.stats?.carryStats,
			},
			{
				borderClass: "border-cyan-500/40",
				titleClass: "text-cyan-400",
				title: "Total created tickets",
				description: "",
				stat: this.stats?.ticketStatsModel,
			},
			{
				borderClass: "border-emerald-500/40",
				titleClass: "text-emerald-400",
				title: "Unique carriers",
				description:
					"People who gained score by completing at least one carry.",
				stat: this.stats?.carrierStatsModel,
				usesPrecedingWindows: true,
			},
			{
				borderClass: "border-rose-500/40",
				titleClass: "text-rose-400",
				title: "Total flagged users",
				description: "Users flagged for illegitimate or harmful activity",
				singleValue: this.stats?.totalFlaggedUsers,
			},
		];
	}

	ngOnInit(): void {
		this.loadStats();
	}

	ngOnDestroy(): void {
		this.statsSubscription?.unsubscribe();
	}

	protected getPeriodValue(
		stat: PeriodStat | null | undefined,
		key: PeriodKey,
	): string {
		return pickStatValue(stat, key);
	}

	protected getTrendValue(card: GlobalStatCard, key: PeriodKey): string | null {
		const trend = this.getTrendPercentage(card, key);
		return trend === null ? null : formatTrend(trend);
	}

	protected isPositiveTrend(card: GlobalStatCard, key: PeriodKey): boolean {
		const trend = this.getTrendPercentage(card, key);
		return trend !== null && trend > 2;
	}

	protected isNegativeTrend(card: GlobalStatCard, key: PeriodKey): boolean {
		const trend = this.getTrendPercentage(card, key);
		return trend !== null && trend < -2;
	}

	protected isNeutralTrend(card: GlobalStatCard, key: PeriodKey): boolean {
		const trend = this.getTrendPercentage(card, key);
		return trend !== null && trend >= -2 && trend <= 2;
	}

	private getTrendPercentage(
		card: GlobalStatCard,
		key: PeriodKey,
	): number | null {
		const stat = card.stat;
		if (!stat || key === "lifetime") return null;

		if (key === "last30Days") {
			const previousThirtyDays = card.usesPrecedingWindows
				? stat.last60Days
				: numericValue(stat.last60Days) - numericValue(stat.last30Days);
			return trendPercentage(stat.last30Days, previousThirtyDays);
		}

		const previousSevenDays = card.usesPrecedingWindows
			? stat.last14Days
			: numericValue(stat.last14Days) - numericValue(stat.last7Days);
		return trendPercentage(stat.last7Days, previousSevenDays);
	}

	protected formatStatValue(value: string | number | null | undefined): string {
		return value === null || value === undefined
			? COMING_SOON
			: formatLinkedUserCount(value);
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
