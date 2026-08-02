import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DiscordServerControllerService, DiscordUserControllerService } from '@dungeon-hub/api-client';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DiscordGuildService } from '../../core/services/discord-guild.service';

export interface ServerStats {
  totalMoneySpent: string;
  totalCarries: string;
  userMoneySpent: string;
  userMoneyEarned: string;
  userCarryCount: number;
}

const COMPACT_SUFFIXES = [
  { threshold: 12, suffix: 't' },
  { threshold: 9, suffix: 'b' },
  { threshold: 6, suffix: 'm' },
  { threshold: 3, suffix: 'k' },
] as const;

export function formatCompactValue(value: string | number): string {
  const text = String(value ?? '0');
  const match = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return text;

  const [, sign, rawInteger, fraction = ''] = match;
  const integer = rawInteger.replace(/^0+(?=\d)/, '');
  const compactUnit = COMPACT_SUFFIXES.find(({ threshold }) => integer.length > threshold);

  if (!compactUnit) {
    const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${sign}${groupedInteger}${fraction ? `.${fraction}` : ''}`;
  }

  // Do the rounding with BigInt so large API values never pass through a lossy Number.
  const precision = 4;
  const decimalScale = 10n ** BigInt(fraction.length);
  const unitScale = 10n ** BigInt(compactUnit.threshold);
  const precisionScale = 10n ** BigInt(precision);
  const absoluteValue = BigInt(`${integer}${fraction}`);
  const divisor = decimalScale * unitScale;
  const rounded = (absoluteValue * precisionScale + divisor / 2n) / divisor;
  const whole = rounded / precisionScale;
  const decimals = (rounded % precisionScale)
    .toString()
    .padStart(precision, '0')
    .replace(/0+$/, '');

  return `${sign}${whole}${decimals ? `.${decimals}` : ''}${compactUnit.suffix}`;
}

export function getDiscordUserId(token: string | null): string {
  if (!token) return '';

  try {
    const payload = token.split('.')[1];
    if (!payload) return '';

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    const match = json.match(/"discord-id"\s*:\s*(?:"(\d+)"|(\d+))/);
    return match?.[1] ?? match?.[2] ?? '';
  } catch {
    return '';
  }
}

@Component({
  selector: 'app-server-stats',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a routerLink="/dashboard" class="btn btn-secondary mb-4 inline-block">
          ← Back to Dashboard
        </a>
        <h2 class="text-3xl font-bold holographic">{{ serverName }} Stats</h2>
        <p class="mt-2 text-gray-400">An overview of completed services and their value.</p>
      </div>

      @if (loading) {
        <div class="card text-center py-12" aria-live="polite">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
          ></div>
          <p class="mt-4 text-gray-400">Loading server stats...</p>
        </div>
      } @else if (error) {
        <div class="card bg-red-900/20 border-red-500 text-center py-12" role="alert">
          <p class="text-red-400 text-lg font-semibold mb-2">Unable to load stats</p>
          <p class="text-gray-300">{{ error }}</p>
          <button type="button" (click)="loadStats()" class="btn btn-secondary mt-4">Retry</button>
        </div>
      } @else if (stats) {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          @for (card of statCards; track card.title) {
            <article class="card {{ card.borderClass }}">
              <p class="text-sm font-medium uppercase tracking-wide {{ card.titleClass }}">
                {{ card.title }}
              </p>
              <p class="mt-3 text-3xl font-bold break-words">{{ card.value }}</p>
              @if (card.description) {
                <p class="mt-2 text-sm text-gray-400">{{ card.description }}</p>
              }
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class ServerStatsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private discordGuildService = inject(DiscordGuildService);
  private discordServerService = inject(DiscordServerControllerService);
  private discordUserService = inject(DiscordUserControllerService);
  private cdr = inject(ChangeDetectorRef);
  private routeSubscription?: Subscription;
  private statsSubscription?: Subscription;

  protected serverId = '';
  protected serverName = 'Server';
  protected stats: ServerStats | null = null;
  protected loading = true;
  protected error = '';

  protected get statCards() {
    if (!this.stats) return [];

    return [
      {
        borderClass: 'border-blue-500/40',
        titleClass: 'text-blue-400',
        title: 'Total money spent',
        value: formatCompactValue(this.stats.totalMoneySpent),
        description: 'Across all completed services',
      },
      {
        borderClass: 'border-purple-500/40',
        titleClass: 'text-purple-400',
        title: 'Total carries',
        value: formatCompactValue(this.stats.totalCarries),
        description: 'Completed by this server',
      },
      {
        borderClass: 'border-cyan-500/40',
        titleClass: 'text-cyan-400',
        title: 'Total tickets',
        value: 'Coming soon',
        description: '',
      },
      {
        borderClass: 'border-amber-500/40',
        titleClass: 'text-amber-400',
        title: 'Your money spent',
        value: formatCompactValue(this.stats.userMoneySpent),
        description: 'As the user receiving a service',
      },
      {
        borderClass: 'border-emerald-500/40',
        titleClass: 'text-emerald-400',
        title: 'Your money earned',
        value: formatCompactValue(this.stats.userMoneyEarned),
        description: 'As the carrier providing a service',
      },
      {
        borderClass: 'border-pink-500/40',
        titleClass: 'text-pink-400',
        title: 'Your completed carries',
        value: formatCompactValue(this.stats.userCarryCount),
        description: 'Completed as a carrier on this server',
      },
    ];
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((paramMap) => {
      this.serverId = paramMap.get('serverId') ?? '';
      const guild = this.discordGuildService.getGuildById(this.serverId);
      this.serverName = guild ? this.discordGuildService.getDisplayName(guild) : 'Server';
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.statsSubscription?.unsubscribe();
  }

  protected loadStats(): void {
    // Read the claim directly from the encoded JWT. Parsing the payload as JSON first would
    // round Discord snowflakes because they are larger than Number.MAX_SAFE_INTEGER.
    const userId = getDiscordUserId(this.authService.getIdToken());
    if (!this.serverId || !userId) {
      this.loading = false;
      this.error = 'Your server or Discord user could not be identified.';
      return;
    }

    this.statsSubscription?.unsubscribe();
    this.loading = true;
    this.error = '';

    this.statsSubscription = forkJoin({
      totalMoneySpent: this.discordServerService.getTotalAmountOfMoneySpentOnServices(
        this.serverId,
      ),
      totalCarries: this.discordServerService.countCarries(this.serverId),
      userMoneySpent: this.discordServerService.getTotalAmountOfMoneySpentOnServices(
        this.serverId,
        userId,
      ),
      userMoneyEarned: this.discordServerService.getTotalAmountOfMoneySpentOnServices(
        this.serverId,
        undefined,
        userId,
      ),
      userCarryCount: this.discordUserService.getCarryCount(userId, this.serverId),
    }).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = null;
        this.loading = false;
        this.error = 'The statistics service did not return a result. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }
}
