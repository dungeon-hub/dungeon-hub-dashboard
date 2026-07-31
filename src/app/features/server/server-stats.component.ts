import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DiscordServerControllerService } from '@dungeon-hub/api-client';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DiscordGuildService } from '../../core/services/discord-guild.service';

export interface ServerStats {
  totalMoneySpent: string;
  totalCarries: string;
  userMoneySpent: string;
  userMoneyEarned: string;
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
          <article class="card border-blue-500/40">
            <p class="text-sm font-medium uppercase tracking-wide text-blue-400">
              Total money spent
            </p>
            <p class="mt-3 text-3xl font-bold break-words">
              {{ formatValue(stats.totalMoneySpent) }}
            </p>
            <p class="mt-2 text-sm text-gray-400">Across all completed services</p>
          </article>

          <article class="card border-purple-500/40">
            <p class="text-sm font-medium uppercase tracking-wide text-purple-400">Total carries</p>
            <p class="mt-3 text-3xl font-bold break-words">{{ formatValue(stats.totalCarries) }}</p>
            <p class="mt-2 text-sm text-gray-400">Completed by this server</p>
          </article>

          <article class="card border-amber-500/40">
            <p class="text-sm font-medium uppercase tracking-wide text-amber-400">
              Your money spent
            </p>
            <p class="mt-3 text-3xl font-bold break-words">
              {{ formatValue(stats.userMoneySpent) }}
            </p>
            <p class="mt-2 text-sm text-gray-400">As the user receiving a service</p>
          </article>

          <article class="card border-emerald-500/40">
            <p class="text-sm font-medium uppercase tracking-wide text-emerald-400">
              Your money earned
            </p>
            <p class="mt-3 text-3xl font-bold break-words">
              {{ formatValue(stats.userMoneyEarned) }}
            </p>
            <p class="mt-2 text-sm text-gray-400">As the carrier providing a service</p>
          </article>
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
  private cdr = inject(ChangeDetectorRef);
  private statsSubscription?: Subscription;

  protected serverId = '';
  protected serverName = 'Server';
  protected stats: ServerStats | null = null;
  protected loading = true;
  protected error = '';

  ngOnInit(): void {
    this.serverId = this.route.snapshot.paramMap.get('serverId') ?? '';
    const guild = this.discordGuildService.getGuildById(this.serverId);
    this.serverName = guild ? this.discordGuildService.getDisplayName(guild) : 'Server';
    this.loadStats();
  }

  ngOnDestroy(): void {
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

  protected formatValue(value: string): string {
    const text = String(value ?? '0');
    const match = text.match(/^(-?)(\d+)(\.\d+)?$/);
    if (!match) return text;

    const [, sign, integer, fraction = ''] = match;
    return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction}`;
  }
}
